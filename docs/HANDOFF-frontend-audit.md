# Passage de relais — audit frontend par blocs

**Écrit le** 2026-09-16, à la fin de l'audit backend.
**Pour** une nouvelle session, qui reprend le même travail côté frontend.

---

## 1. À faire AVANT toute chose

La branche `fix/backend-audit-livraison` porte six commits non fusionnés, et
**une migration non appliquée à la base distante**.

```bash
npm run db:migrate   # applique drizzle/0006 — sinon /compte, /commander,
                     # /commandes/[id] et /admin/orders lèvent une erreur de requête
```

Le code lit `order.delivery_fee` et `order.delivery_zone_label`, absentes de la base tant
que la migration n'est pas passée. **Tant que ce n'est pas fait, la moitié du parcours
client est cassée** — inutile d'auditer un écran qui ne rend pas.

Netlify déploie automatiquement au push sur `main` : migrer d'abord, fusionner ensuite.

## 2. Ce qui vient d'être fait (ne pas le refaire)

Audit backend complet — schéma, migrations, RLS/GRANTs, Better Auth, les 14 Server
Actions, la couche `data/*` et son cache, ImageKit, l'export CSV, la CI et le déploiement.
13 défauts corrigés en six commits. Le détail est dans
[`SR-PTD_2026-09-16_backend-audit_corrections.md`](./SR-PTD_2026-09-16_backend-audit_corrections.md) ;
la section « Known rough edges » de `CLAUDE.md` reflète l'état d'arrivée.

Ce qu'il faut en retenir pour le frontend :

- **Le checkout a changé.** `checkout-flow.tsx` a reçu un sélecteur de zone, un
  récapitulatif à trois lignes (sous-total / frais / total) et un `clientRequestId`
  d'idempotence. C'est le composant le plus récemment remanié du storefront — donc celui
  dont la cohérence visuelle avec le reste est la moins éprouvée.
- **Règle métier structurante** : une zone de livraison inconnue **ne bloque jamais** une
  commande. La vente se conclut sur WhatsApp, refuser une destination est le rôle du
  commerçant. Tout écran qui semblerait contredire ça est un bug.
- **`src/components/storefront/catalogue/product-card.tsx` est modifié et non
  committé** — travail en cours de l'utilisateur (SKU masqué, `inset-4` → `inset-1`,
  `mt-3` → `mt-2`). Ne pas l'annuler, ne pas l'inclure dans un commit sans son accord.

## 3. Le frontend n'a PAS été audité

Aucun composant, aucune page, aucun aspect d'accessibilité ou de performance n'a été
examiné pendant le chantier backend. Les seules modifications frontend faites l'ont été
par nécessité (propager l'affichage des frais), pas par choix d'amélioration.

## 4. À lire avant d'écrire une ligne

- **[`docs/design/README.md`](./design/README.md)** et tout `docs/design/` — c'est le
  système de design du projet, déjà écrit : `tokens.md`, `typography.md`,
  `components.md`, `layout-and-chrome.md`, `sections-and-backgrounds.md`, `motion.md`,
  `content-and-copy.md`, `new-page-checklist.md`, `catalogue-refonte.md`.
  **Ne pas re-dériver ces règles par lecture du code** : elles sont normatives.
- **[`docs/AUDIT-2026-09.md`](./AUDIT-2026-09.md)** — audit précédent, même méthode
  (un domaine à la fois, sévérités `blocker`/`major`/`minor`/`nit`). Reprendre son
  vocabulaire évite deux échelles concurrentes.
- **[`docs/FIXES.md`](./FIXES.md)** — défauts déjà connus et leur résolution.

Non-négociables que le design system porte, rappelés ici parce qu'ils se violent vite :

| Règle | Détail |
|---|---|
| Violet `#B818C9` | couleur primaire |
| Vert `#25D366` | **exclusivement** le bouton de confirmation WhatsApp |
| Rayons | échelle `rounded-ls-*` (xs/sm/md/lg = 4/8/12/16) |
| Piège Tailwind v4 | `rounded-[--radius-ls-md]` rend des coins **carrés** — toujours `rounded-ls-md` |
| Animation | **pas de Framer Motion** (non installé) |
| Carrousel | **aucune librairie** — le rail home est du scroll-snap CSS + drag pointeur |
| Icônes | `lucide-react` seulement ; `@phosphor-icons/react` n'est pas installé |
| Référence de cohérence | la home (`/`) fait foi |

## 5. Découpage proposé en blocs

Huit blocs, du plus structurant au plus périphérique. L'ordre compte : les blocs 1 et 2
fixent le vocabulaire visuel que les suivants réutilisent.

| # | Bloc | Surface |
|---|---|---|
| 1 | **Layout & navigation** | `navbar`, `nav-drawer`, `nav-links`, `mobile-bottom-nav`, `footer`, `logo`, `cart-badge`, `admin-nav-link`, `src/app/layout.tsx`, `(storefront)/layout.tsx`, `template.tsx` |
| 2 | **Home** | `hero`, `catalog-rail`, `category-showcase`, `home-sections`, `(storefront)/page.tsx` — la référence de cohérence |
| 3 | **Catalogue** | `catalogue-toolbar`, `sort-control`, `filters-sheet`, `active-filters`, `category-grid`, `product-grid`, `product-card` (⚠ WIP non committé) |
| 4 | **Fiche produit** | `product-purchase-experience`, `delivery-zones`, `reviews-section`, `review-form`, `tutorial-section` |
| 5 | **Panier & tunnel** | `cart-client`, `cart-item-row`, `cart-summary`, `empty-cart`, `checkout-flow` (⚠ remanié récemment) |
| 6 | **Compte & auth** | `login-form`, `signup-form`, `sign-out-button`, `/compte`, `/commandes/[id]`, `/connexion`, `/inscription` |
| 7 | **Recherche** | `search-box`, `search-modal`, `/recherche` |
| 8 | **Admin** | `AdminSidebar`, `ui.tsx`, `products-admin`, `categories-admin`, `home-admin`, `media-manager`, `order-transitions`, `stock-adjust`, `review-moderation`, `whatsapp-config-form` |

Blocs transverses, à traiter en fin de parcours une fois les huit passés :
**accessibilité** (navigation clavier, libellés, contrastes — `src/lib/utils/contrast.ts`
existe déjà et valide AA sur les couleurs de catégorie) et **performance** (la CI bloque
sur Lighthouse mobile ≥ 85, LCP < 2,5 s, CLS < 0,1 ; voir `lighthouserc.json`).

## 6. Méthode qui a fonctionné sur le backend

- **Un bloc à la fois**, vérifié et committé avant de passer au suivant. Aucun état
  intermédiaire cassé : une interruption en cours de chantier n'a rien laissé à démêler.
- **Vérifier soi-même ce qu'un agent délégué rapporte.** Sur huit tâches, quatre écarts
  ont été rattrapés à la relecture, que les rapports présentaient comme terminés. Un
  rapport décrit ce que l'agent croit avoir fait, pas toujours ce qui est dans le code.
- **Nommer l'objectif, pas seulement le symptôme**, dans un brief délégué. Un brief qui
  listait deux options Sentry à désactiver a produit exactement deux options désactivées,
  en laissant ouverte une troisième qui fuyait autant.
- **Chaîne qualité à chaque étape** : `npm run lint && npm run typecheck && npm run build`.
  Il n'y a **aucun test runner** dans ce dépôt — ne pas en installer, ne pas en inventer.
  Des erreurs `EMAXCONNSESSION` du pooler Supabase apparaissent parfois pendant la
  génération statique : bruit préexistant absorbé par des try/catch, le build doit
  néanmoins finir en succès.

## 7. Contraintes techniques à ne pas perdre de vue

- **`cacheComponents: true`** (Next 16) : les pages sont statiques par défaut. Tout ce qui
  lit `cookies()`/`headers()` ou des données vives doit vivre dans sa propre frontière
  `<Suspense>` — voir `src/app/layout.tsx` → `CartBadge`.
- **Next 16 n'est pas la version des souvenirs du modèle** : lire
  `node_modules/next/dist/docs/` avant d'écrire du code Next.
- **`dbAnon` / `dbAdmin`** ne s'importent jamais depuis un composant client. Onze modules
  serveur portent maintenant `import 'server-only'` : si le build s'en plaint, c'est un
  vrai import client→serveur à corriger, pas une directive à retirer.
- **Images ImageKit**, loader custom (`src/lib/images/loader.ts`), optimisation
  Next/Netlify volontairement contournée.

## 8. Dette connue, hors périmètre sauf décision contraire

`wishlist` et `product.hasPdf` orphelins ; `tutorial_content` en lecture seule (pas de
CRUD admin) ; pas de CRUD variantes ni de `/admin/orders/[id]` ; `getProducts` charge tout
le catalogue puis pagine en mémoire ; aucune validation d'entrée à l'exécution ; aucun
rate limiting. La liste complète est dans « Known rough edges » de `CLAUDE.md`.
