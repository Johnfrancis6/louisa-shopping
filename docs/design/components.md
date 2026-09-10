# Composants

## Boutons

| Type | Style |
|---|---|
| **Primaire** (Ajouter au panier, auth, checkout, filtres, hero CTA) | `bg-ls-violet text-ls-white hover:bg-ls-violet-dark` — souvent `rounded-full` (pilule) sur les CTA, `rounded-ls-sm` pour les submits de formulaire (via `<Button>`). |
| **Confirmer WhatsApp** (`commandes/[id]`) | `rounded-full bg-ls-whatsapp text-white hover:bg-ls-whatsapp-dark`. **Seul bouton vert.** |
| **Secondaire / ghost** | shadcn `<Button variant="outline">` / `"ghost"` — `--secondary`/`--accent` = `ls-gray-100`. |
| **Bouton violet clair** (« Voir le catalogue » home) | `rounded-full border border-ls-violet-tint bg-ls-violet-bg text-ls-violet-dark hover:bg-ls-violet-tint`. |
| **Icône rond** (quick-add, agrandir, réseaux…) | `flex h-10 w-10 items-center justify-center rounded-full` + `hover:scale-105 active:scale-95` (voir motion). |

`<Button>` (`src/components/ui/button.tsx`) : base `rounded-ls-sm`, `--radius` global.
Le variant `default` = `bg-primary` = **violet** automatiquement.

Cible tactile : **jamais < 44px** de haut sur mobile (`h-11` / `h-12`).

## Cards

Règle : **filet OU ombre, pas les deux** au repos.

| Card | Fichier | Style |
|---|---|---|
| **Produit (catalogue)** | `catalogue/product-card.tsx` | `rounded-ls-md bg-ls-white p-3 shadow-ls-card` ; nom + SKU **en tête**, image `object-contain` encadrée (`rounded-ls-sm`, inset), prix `text-[19px] font-semibold`, bouton rond `h-10`. Hover desktop : `md:hover:-translate-y-0.5 md:hover:shadow-ls-card-hover`. Classe `ls-reveal`. |
| **Tuile catégorie (/catalogue)** | `catalogue/category-grid.tsx` | box bordée `rounded-ls-md border border-ls-gray-200 bg-ls-white p-3`, image `object-contain`, libellé + « N articles ». Active : `border-ls-gray-900`. Fallback SVG grille si pas d'image. |
| **Bloc catégorie (home)** | `home/category-showcase.tsx` | tout le bloc = **un `<Link>`** : accroche (eyebrow) + image `aspect-[3/2] rounded-ls-xl shadow-ls-showcase` (nom en `<h3>` chip blanc bas-droite) + faux-bouton « Voir le catalogue · N articles ». `aria-label` porte le nom. `md:group-hover:scale-[1.03]` sur l'image. |
| **Carte SAV (home)** | `home/home-sections.tsx` | `rounded-ls-md border border-ls-gray-200 bg-ls-white p-5 min-h-40` : icône encre `size={28}` en haut, `<h3>`, description, lien « En savoir plus → » poussé en bas (`mt-auto`). |
| **Étape process (home)** | `home/home-sections.tsx` | `rounded-ls-md bg-ls-white p-5 ring-1 ring-ls-violet-tint` (sur fond violet) : badge numéro rond `bg-ls-violet`, placeholder illustration `border-dashed`, texte. |
| **Carte actualité (home)** | `home/home-sections.tsx` | **pas de box** — juste image `aspect-[16/10] rounded-ls-lg` + date + `<h3>` + extrait + « Lire → ». |

## Inputs (`src/components/ui/`)

`input` / `textarea` / `input-group` : `rounded-ls-sm border border-input`
(= `ls-gray-200`), focus `focus-visible:border-ring focus-visible:ring-3
focus-visible:ring-ring/50` (ring = violet). `toggle` / `toggle-group` :
`rounded-ls-sm`. `dialog` : popup `rounded-ls-md`. `sheet` : `data-[side=bottom]:rounded-t-ls-md`.

## Badges & pastilles

- Badge panier (`cart-badge.tsx`) : `rounded-full bg-ls-danger text-white text-[10px]`,
  bump à l'ajout (`key={count}` + `animate-in zoom-in-50`).
- Pastille stock : `h-2 w-2 rounded-full bg-ls-success`.
- Chip de catégorie sur image : `rounded-full bg-ls-white/95 text-ls-violet-dark shadow-ls-card`.

## Filet d'accent (dispositif récurrent)

`<span class="mb-3 block h-[3px] w-8 rounded-full bg-ls-violet" aria-hidden />`
au-dessus de chaque eyebrow de section (via `SectionHeader`), + footer, + hero
(en `bg-ls-violet-hero` sur photo).

## Modale de recherche — anatomie

`Dialog.Popup` : `fixed inset-x-4 top-[8vh] mx-auto max-w-xl max-h-[80vh]
rounded-ls-lg bg-ls-white shadow-lg ring-1 ring-black/5`. Entrée :
`data-starting-style:opacity-0 data-starting-style:scale-95 data-starting-style:translate-y-2`,
`duration-[var(--duration-ls-fast)]`.

- **En-tête** : loupe + `<input autoFocus>` sans bordure + chip `esc` (`sm:` only).
- **Corps** (`overflow-y-auto py-2`) :
  - vide + récentes → groupe « Recherches récentes » (localStorage, `Clock` + X).
  - vide sans récentes → « Tapez pour rechercher… ».
  - zéro résultat → message + lien violet « Parcourir le catalogue ».
  - résultats → groupes **Produits** (`Row` : miniature `h-12` + « nom · SKU »
    gris + prix gras) / **Catégories** (icône ronde `h-11` + « nom · N articles »)
    / ligne « Voir tous les résultats pour « … » ».
- **Ligne active** : `bg-ls-violet-bg shadow-[inset_2px_0_0_var(--color-ls-violet)]`
  (barre d'accent violette à gauche). Pilotée au clavier (`↑ ↓` / `↵` / `esc`),
  focus reste sur l'input (`aria-activedescendant`-like via `activeIndex`).
- **Pied** (`sm:` only) : rappels `↑↓ naviguer · ↵ ouvrir · esc fermer`.

Recherche live : debounce 150 ms, garde du dernier `requestId`, `useTransition`.
Remonte à chaque ouverture (`key={openCount}` sur `<SearchModal>`).
