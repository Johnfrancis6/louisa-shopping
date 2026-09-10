# Layout & chrome

## Arborescence

```
src/app/(storefront)/layout.tsx
  <SearchProvider>                      ← contexte modale recherche (⌘K global)
    <div class="flex min-h-svh flex-col bg-ls-gray-50">
      <Navbar />                        ← sticky top-0 z-40
      <main class="min-h-[calc(100svh-3.5rem)] flex-1">{children}</main>
      <Footer />                        ← global, toutes les pages storefront
      <MobileBottomNav />               ← fixed bottom-0 z-40 md:hidden
```

`src/app/(storefront)/template.tsx` enveloppe `{children}` d'une transition
d'entrée (voir [motion.md](motion.md)).

Le fond de page par défaut est `bg-ls-gray-50`. **Chaque section pose son propre
fond explicitement** (`bg-ls-white`, `bg-ls-violet-bg`, `bg-ls-gray-50`).

## Navbar — `src/components/storefront/layout/navbar.tsx`

`h-14` (3.5rem), `max-w-6xl`, sticky, `border-b border-ls-gray-200 bg-ls-white`.

Layout : **Logo · [liens de nav `lg:`] · barre de recherche · panier ·
[compte `md:` / hamburger `< lg`]**.

- **Liens de nav horizontaux** (`nav-links.tsx` → `NavbarLinks`) : visibles en
  `lg:` seulement. Mêmes entrées que le drawer (`NAV_LINKS`). Recherche poussée à
  droite (`md:ml-auto md:max-w-xs`).
- La **barre de recherche est toujours visible**, mobile compris (`SearchTrigger`,
  un `<button>` façon input qui ouvre la command-palette). Chip `⌘K` visible en
  `md:` seulement.
- Panier : `<Link href="/panier">` + `<CartBadge />` (pastille, sous `<Suspense>`).
- `md:` : lien compte visible.
- `< lg` : hamburger (`NavDrawer`). `< md` : pas de lien compte (il est dans la
  bottom-nav).

## NavDrawer (menu mobile / tablette) — `nav-drawer.tsx`

Hamburger (`< lg`) → `Sheet` (base-ui) côté **gauche**, `w-[84%] sm:max-w-sm`.
Contenu : header logo + bouton X (fourni par `Sheet`) · liste de liens · bouton
« Contactez-nous » violet en bas (`mt-auto`).

Liens `NAV_LINKS` (source unique, `nav-links.tsx`) — `House / Store / Newspaper /
Info / Mail` : `Accueil` `/` · `Nos boutiques` `/catalogue` · `Actualités`
`/#actualites` · `À propos` `/#a-propos` · `Contact` `/#contact`.
Lien actif : `bg-ls-violet-bg text-ls-violet-dark` + icône `text-ls-violet`.
Typo aérée : `text-[15px]`, poids normal, icônes `strokeWidth={1.9}`, `gap-1` entre items.

## État actif des liens de nav — `useActiveNav()` (`nav-links.tsx`)

Prédicat partagé navbar + drawer, sous `<Suspense>` (isole `usePathname()` —
obligatoire avec `cacheComponents`).

- `/catalogue*` → « Nos boutiques ».
- Sur `/` : **scroll-spy** (IntersectionObserver, `rootMargin: -20% 0px -70%`) sur
  les sections `#actualites` / `#a-propos` / `#contact` ; « Accueil » actif tant
  qu'aucune n'est atteinte ; fallback « touche du pied de page » → dernière section.
- Hors `/` et `/catalogue` : rien d'actif.

## MobileBottomNav — `mobile-bottom-nav.tsx`

`fixed bottom-0 z-40 md:hidden`, barre visible `h-14` + `pb-[env(safe-area-inset-bottom)]`.
4 items : **Accueil · Boutique (`/catalogue`) · Panier · Compte**.
(La recherche N'EST PAS dans la bottom-nav — elle est dans la top bar.)

État actif = **icône + label en `text-ls-violet`**, rien d'autre (pas de cercle,
pas de scale, pas de halo). Icônes `strokeWidth={2.25}`.
`usePathname()` sous `<Suspense>` (fallback = mêmes items, aucun actif).

**Hauteur = `--ls-bottom-nav-h`** (`calc(3.5rem + safe-area)`). Tout CTA sticky
bas de page se cale avec `bottom-[var(--ls-bottom-nav-h)]` (voir la fiche
produit : `product-purchase-experience.tsx`). Le footer réserve l'espace avec
`pb-[calc(var(--ls-bottom-nav-h)+1.25rem)]`.

## Footer — `src/components/storefront/layout/footer.tsx`

Global, 3 bandes séparées par `border-t` / `border-b`, fond `bg-ls-white ls-dots` :

1. **`#a-propos` — Réassurance produit** : filet d'accent + eyebrow « D'où
   viennent nos produits » + `h2` + **3 points à icône** dans des pastilles
   `bg-ls-violet-bg text-ls-violet-dark` (`Handshake` fournisseur / `ClipboardCheck`
   contrôle / `BadgeCheck` fiabilité).
2. **Marque · nav · contact** — grille `md:grid-cols-[1.6fr_1fr_1.2fr]` :
   - Logo + phrase + **réseaux** (`SocialLink` : WhatsApp / Facebook / Instagram
     en **SVG de marque inline** `fill="currentColor"` — lucide 1.41 n'a plus les
     icônes de marque ; `href="#"` placeholder).
   - `Explorer` : liste de liens.
   - **`#contact`** : lignes préfixées d'icônes (`MapPin` / `Phone` / `Mail`,
     `text-ls-gray-400`).
3. **Barre légale** : © + Mentions légales / CGV / Confidentialité. Padding bas
   mobile `pb-[calc(var(--ls-bottom-nav-h)+1.25rem)]`.

## Modale de recherche — `src/components/storefront/search/search-modal.tsx`

Command-palette (façon ⌘K). Détails d'anatomie dans [components.md](components.md).
Montée une seule fois par `SearchProvider` dans le layout. Ouverte par :
`SearchTrigger` (navbar) · raccourci `mod+k` (global) · onglet recherche du drawer.
`/recherche` reste en **fallback SSR** (partage d'URL, no-JS).
Action serveur : `src/lib/actions/search.ts` → `searchStorefront(q)`.

## z-index

| z | Élément |
|---|---|
| 40 | Navbar (sticky), MobileBottomNav (fixed) |
| 50 | `Dialog` / `Sheet` (backdrop + popup) |
| 100 | grain global (`body::after`, `pointer-events:none`, ~2%) |
