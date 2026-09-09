-- IDEMPOTENT : ce fichier peut être ré-exécuté (grants ré-appliqués, drop
-- policy if exists + enable rls no-op si déjà actif). Appliqué via
-- `npm run db:policies` (et `npm run db:deploy`, après les migrations).
--
-- ⚠️ Rôles de connexion (cf. src/lib/db/client.ts, .env.example) :
--   DATABASE_URL_ANON  -> app_anon    : LOGIN, `in role anon`, PAS de BYPASSRLS.
--                          RLS le contraint réellement (filet deny-by-default).
--   DATABASE_URL_ADMIN -> app_service : LOGIN, `in role service_role`, BYPASSRLS.
--                          Accès complet, RLS ignorée (comme service_role).
--   DATABASE_URL_MIGRATE -> postgres  : DDL / migrations / seed uniquement.
-- `anon` et `service_role` sont NOLOGIN chez Supabase : on ne peut pas s'y
-- connecter directement, d'où les rôles applicatifs app_anon / app_service.
-- Création (une fois, hors de ce fichier car non idempotent) :
--   create role app_anon    login password '<pw>' in role anon;
--   create role app_service login password '<pw>' bypassrls in role service_role;

-- ---------------------------------------------------------------------------
-- GRANTS niveau table.
-- Les migrations tournent via `postgres` ; les tables ainsi créées n'héritent
-- PAS des GRANT Supabase par défaut pour anon/authenticated/service_role
-- (réservés aux objets créés par `supabase_admin`). Sans SELECT niveau table,
-- une policy RLS ne sert à rien : elle filtre des lignes parmi ce que le GRANT
-- autorise, elle n'accorde aucun accès.
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

-- Lecture publique : SEULEMENT les tables à policy `*_public_read` ci-dessous.
-- Surtout PAS order/customer/order_item/stock_ledger/wishlist/auth (double
-- verrou : ni GRANT, ni policy).
grant select on
  "category", "product", "variant", "media", "tutorial_content",
  "zone", "whatsapp_config", "review"
to anon, authenticated;

-- dbAdmin (app_service) : accès complet. BYPASSRLS gère la partie RLS, ce
-- GRANT la partie privilèges de table.
grant select, insert, update, delete on all tables in schema public to service_role;

-- supabase/policies.sql
-- Policies RLS — s'appliquent au rôle utilisé par dbAnon (app_anon, `in role anon`).
-- dbAdmin (app_service) bypasse RLS.
--
-- STRATÉGIE (contrat v2.5, section C — tranchée) :
-- Pas de pont RLS auth.uid() <-> Better Auth. L'autorisation "propriétaire"
-- (un client ne voit que SES commandes / sa wishlist / son profil) est
-- portée par les Server Actions (src/lib/actions/, agent Logique métier),
-- qui passent par `dbAdmin` et vérifient explicitement la propriété en
-- TypeScript (ex. `order.customerId === session.user.id`).
-- RLS ici ne sert QUE de filet de sécurité deny-by-default : dbAnon ne doit
-- jamais pouvoir lire/écrire une donnée nominative, quoi qu'il arrive côté
-- application. Aucune policy basée sur auth.uid() dans ce fichier.

-- ---------------------------------------------------------------------------
-- Better Auth (user/session/account/verification) — AUCUNE policy
-- anon/authenticated => deny-by-default. Contiennent tokens de session et
-- hash de mot de passe : ne doivent jamais être lisibles via dbAnon, quoi
-- qu'il arrive côté application. Better Auth lit/écrit via dbAdmin
-- (contrat client.ts).
-- ---------------------------------------------------------------------------
alter table "user" enable row level security;
alter table "session" enable row level security;
alter table "account" enable row level security;
alter table "verification" enable row level security;

-- ---------------------------------------------------------------------------
-- Category — lecture publique des catégories visibles uniquement
-- ---------------------------------------------------------------------------
alter table "category" enable row level security;

drop policy if exists "category_public_read" on "category";
create policy "category_public_read"
  on "category" for select
  to anon, authenticated
  using (visible = true);

-- ---------------------------------------------------------------------------
-- Product — lecture publique des produits actifs uniquement
-- ---------------------------------------------------------------------------
alter table "product" enable row level security;

drop policy if exists "product_public_read" on "product";
create policy "product_public_read"
  on "product" for select
  to anon, authenticated
  using (is_active = true);

-- ---------------------------------------------------------------------------
-- Variant — lecture publique, seulement si le produit parent est actif
-- ---------------------------------------------------------------------------
alter table "variant" enable row level security;

drop policy if exists "variant_public_read" on "variant";
create policy "variant_public_read"
  on "variant" for select
  to anon, authenticated
  using (
    exists (
      select 1 from "product" p
      where p.id = "variant".product_id and p.is_active = true
    )
  );

-- ---------------------------------------------------------------------------
-- Media — idem Variant
-- ---------------------------------------------------------------------------
alter table "media" enable row level security;

drop policy if exists "media_public_read" on "media";
create policy "media_public_read"
  on "media" for select
  to anon, authenticated
  using (
    exists (
      select 1 from "product" p
      where p.id = "media".product_id and p.is_active = true
    )
  );

-- ---------------------------------------------------------------------------
-- TutorialContent — idem, la vérification has_tutorial reste côté app (UI)
-- ---------------------------------------------------------------------------
alter table "tutorial_content" enable row level security;

drop policy if exists "tutorial_content_public_read" on "tutorial_content";
create policy "tutorial_content_public_read"
  on "tutorial_content" for select
  to anon, authenticated
  using (
    exists (
      select 1 from "product" p
      where p.id = "tutorial_content".product_id and p.is_active = true
    )
  );

-- ---------------------------------------------------------------------------
-- Zone — lecture publique (nécessaire au calcul/affichage des frais livraison)
-- ---------------------------------------------------------------------------
alter table "zone" enable row level security;

drop policy if exists "zone_public_read" on "zone";
create policy "zone_public_read"
  on "zone" for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- WhatsappConfig — lecture publique (numero / lien_wa nécessaires au bouton
-- WhatsApp flottant + redirect checkout), écriture réservée à dbAdmin.
-- ---------------------------------------------------------------------------
alter table "whatsapp_config" enable row level security;

drop policy if exists "whatsapp_config_public_read" on "whatsapp_config";
create policy "whatsapp_config_public_read"
  on "whatsapp_config" for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Review — SEULE lecture publique des avis approuvés est exposée à dbAnon.
-- L'écriture d'un avis (par un client authentifié) passe par une Server
-- Action -> dbAdmin, qui vérifie la propriété et force status='pending' ;
-- aucune policy insert/update ici pour anon/authenticated.
-- ---------------------------------------------------------------------------
alter table "review" enable row level security;

drop policy if exists "review_public_read_approved" on "review";
create policy "review_public_read_approved"
  on "review" for select
  to anon, authenticated
  using (status = 'approved');

-- ---------------------------------------------------------------------------
-- Customer — AUCUNE policy anon/authenticated => deny-by-default.
-- Toute lecture/écriture (profil, adresse) passe par une Server Action ->
-- dbAdmin avec vérification explicite `customer.id === session.user.id`.
-- ---------------------------------------------------------------------------
alter table "customer" enable row level security;

-- ---------------------------------------------------------------------------
-- Order — AUCUNE policy anon/authenticated => deny-by-default.
-- /commandes/[id] et l'historique client sont servis par une Server Action
-- (dbAdmin) qui vérifie `order.customerId === session.user.id` avant de
-- renvoyer la ligne. Pas d'accès direct dbAnon, même en lecture seule.
-- ---------------------------------------------------------------------------
alter table "order" enable row level security;

-- ---------------------------------------------------------------------------
-- OrderItem — idem Order, deny-by-default.
-- ---------------------------------------------------------------------------
alter table "order_item" enable row level security;

-- ---------------------------------------------------------------------------
-- StockLedger — deny-by-default. Réservé à dbAdmin (Logique métier / Admin),
-- conformément au contrat D ("toutes les mutations StockLedger").
-- ---------------------------------------------------------------------------
alter table "stock_ledger" enable row level security;

-- ---------------------------------------------------------------------------
-- Wishlist — deny-by-default. Lecture/écriture via Server Action -> dbAdmin
-- avec vérification `wishlist.customerId === session.user.id`.
-- ---------------------------------------------------------------------------
alter table "wishlist" enable row level security;