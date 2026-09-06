-- supabase/policies.sql
-- Policies RLS — s'appliquent au rôle utilisé par dbAnon (anon / authenticated).
-- dbAdmin (service_role) bypass RLS nativement sur Supabase — aucune policy
-- n'est nécessaire pour ce rôle, PAR CONSTRUCTION Supabase.
--
-- Dépendance ouverte (signalée, non résolue ici — cf. lib/db/client.ts) :
-- les policies "propriétaire" (Order, Wishlist, Customer) supposent que
-- auth.uid() reflète l'utilisateur Better Auth courant. Ce pont doit être
-- confirmé par l'agent Auth avant mise en prod.

-- ---------------------------------------------------------------------------
-- Category — lecture publique des catégories visibles uniquement
-- ---------------------------------------------------------------------------
alter table "category" enable row level security;

create policy "category_public_read"
  on "category" for select
  to anon, authenticated
  using (visible = true);

-- ---------------------------------------------------------------------------
-- Product — lecture publique des produits actifs uniquement
-- ---------------------------------------------------------------------------
alter table "product" enable row level security;

create policy "product_public_read"
  on "product" for select
  to anon, authenticated
  using (is_active = true);

-- ---------------------------------------------------------------------------
-- Variant — lecture publique, seulement si le produit parent est actif
-- ---------------------------------------------------------------------------
alter table "variant" enable row level security;

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

create policy "zone_public_read"
  on "zone" for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- WhatsappConfig — lecture publique du numéro (nécessaire au lien wa.me),
-- écriture réservée à dbAdmin (aucune policy insert/update pour anon/authenticated)
-- ---------------------------------------------------------------------------
alter table "whatsapp_config" enable row level security;

create policy "whatsapp_config_public_read"
  on "whatsapp_config" for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Customer — un client ne voit / modifie que sa propre ligne
-- ---------------------------------------------------------------------------
alter table "customer" enable row level security;

create policy "customer_self_select"
  on "customer" for select
  to authenticated
  using (id = auth.uid());

create policy "customer_self_update"
  on "customer" for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "customer_self_insert"
  on "customer" for insert
  to authenticated
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- Order — un client ne voit que ses propres commandes.
-- Aucune policy insert/update pour anon/authenticated : la création de
-- commande passe par lib/actions/ (Logique métier), qui écrit via dbAdmin
-- après validation serveur (montants, stock, etc.) — jamais en écriture
-- directe cliente, même authentifiée.
-- ---------------------------------------------------------------------------
alter table "order" enable row level security;

create policy "order_owner_select"
  on "order" for select
  to authenticated
  using (customer_id = auth.uid());

-- ---------------------------------------------------------------------------
-- OrderItem — lecture si la commande parente appartient au client
-- ---------------------------------------------------------------------------
alter table "order_item" enable row level security;

create policy "order_item_owner_select"
  on "order_item" for select
  to authenticated
  using (
    exists (
      select 1 from "order" o
      where o.id = "order_item".order_id and o.customer_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- StockLedger — aucune policy anon/authenticated => accès refusé par défaut.
-- Réservé à dbAdmin (Logique métier / Admin), conformément au contrat C
-- ("toutes les mutations StockLedger" = périmètre Logique métier).
-- ---------------------------------------------------------------------------
alter table "stock_ledger" enable row level security;

-- ---------------------------------------------------------------------------
-- Review — lecture publique des avis approuvés ; écriture par le client
-- authentifié pour ses propres avis (statut forcé à 'pending' par défaut,
-- la modération vers 'approved' est réservée à dbAdmin/Admin)
-- ---------------------------------------------------------------------------
alter table "review" enable row level security;

create policy "review_public_read_approved"
  on "review" for select
  to anon, authenticated
  using (status = 'approved');

create policy "review_owner_read_own"
  on "review" for select
  to authenticated
  using (customer_id = auth.uid());

create policy "review_owner_insert"
  on "review" for insert
  to authenticated
  with check (customer_id = auth.uid() and status = 'pending');

-- ---------------------------------------------------------------------------
-- Wishlist — CRUD limité à ses propres lignes
-- ---------------------------------------------------------------------------
alter table "wishlist" enable row level security;

create policy "wishlist_owner_select"
  on "wishlist" for select
  to authenticated
  using (customer_id = auth.uid());

create policy "wishlist_owner_insert"
  on "wishlist" for insert
  to authenticated
  with check (customer_id = auth.uid());

create policy "wishlist_owner_delete"
  on "wishlist" for delete
  to authenticated
  using (customer_id = auth.uid());