# Tokens

Tout est défini dans **`src/app/design-system.css`** (`@theme inline`).
Le mapping vers les variables shadcn/base-ui (`--primary`, `--radius`, …) est dans
**`src/app/globals.css`** — ne jamais redéfinir ces variables ailleurs.

---

## Piège Tailwind v4

**`class-[--ma-var]` ne s'enveloppe PAS dans `var()`** dans ce build. Résultat :
`rounded-[--radius-ls-md]` compile en `border-radius: --radius-ls-md` → invalide →
**coins carrés**. Idem `duration-[--duration-ls-fast]`, `ease-[--ease-ls-out]`.

**Formes correctes :**

| Besoin | Écrire |
|---|---|
| Rayon | `rounded-ls-sm` `rounded-ls-md` `rounded-ls-lg` `rounded-ls-xl` `rounded-ls-xs` (+ `rounded-t-ls-md`, etc.) |
| Ombre | `shadow-ls-card` `shadow-ls-card-hover` `shadow-ls-cta` `shadow-ls-showcase` `shadow-ls-sheet` |
| Couleur | `bg-ls-violet` `text-ls-gray-600` `border-ls-gray-200` `ring-ls-violet` … (tous générés depuis `--color-ls-*`) |
| Durée / easing / var custom | `duration-[var(--duration-ls-fast)]` · `ease-[var(--ease-ls-out)]` · `bottom-[var(--ls-bottom-nav-h)]` |
| Typo shorthand | `[font:var(--text-ls-body)]` (déjà avec `var()`) |

Contrôle : `grep -rc "border-radius:--radius" .next/static/**/*.css` → **0**.

---

## Couleurs

### Encre & gris (rampe Tailwind `gray`)

`--color-ls-white #FFFFFF` · `gray-50 #F9FAFB` · `100 #F3F4F6` · `200 #E5E7EB`
(filet standard) · `300 #D1D5DB` · `400 #9CA3AF` · `500 #6B7280` (texte secondaire)
· `600 #4B5563` (texte courant sur blanc) · `700 #374151` · `800 #1F2937` ·
`900 #111827` (**encre** : titres, texte fort).

### Violet de marque (accent principal)

| Token | Hex | Usage |
|---|---|---|
| `--color-ls-violet` | `#B818C9` | boutons primaires (`--primary`), badges, filet d'accent, focus ring |
| `--color-ls-violet-dark` | `#911CA0` | hover, **texte violet sur fond clair** (eyebrows, liens), icônes actives |
| `--color-ls-violet-hero` | `#D96AE6` | **uniquement** le grand titre du hero (sur photo) |
| `--color-ls-violet-tint` | `#F1D9F5` | bordures / liserés violets, survol léger |
| `--color-ls-violet-bg` | `#FAEDFB` | fonds (section Process, bouton « Voir le catalogue », lien actif drawer) |

### Vert WhatsApp — **contrainte fixe**

`--color-ls-whatsapp #25D366` / `--color-ls-whatsapp-dark #1EBE5A`.
**Un seul usage** : le bouton « Confirmer sur WhatsApp » (`src/app/(storefront)/commandes/[id]/page.tsx`).
Jamais pour « Ajouter au panier », un lien, une pastille de stock, etc.

### Sémantique

`--color-ls-success #059669` (+ `-bg #ECFDF5`) — pastille stock, « en stock ».
`--color-ls-warning #D97706` (+ `-bg #FFFBEB`).
`--color-ls-danger #DC2626` (+ `-bg #FEF2F2`) — badge panier, erreurs.
`--color-ls-info #2563EB` — **uniquement** l'icône « commande validée » du bloc SAV.

### Indigo (`--color-ls-accent* #4F46E5`)

**Admin uniquement.** Ne pas utiliser dans `src/components/storefront/` ni
`src/app/(storefront)/`.

---

## Rayons — échelle unique, 5 crans + `full`

| Utilitaire | px | Rôle |
|---|---|---|
| `rounded-ls-xs` | 4 | badges stock, labels promo, chips carrés |
| `rounded-ls-sm` | 8 | inputs, selects, textareas, miniatures, petits boutons, icônes cliquables carrées |
| `rounded-ls-md` | 12 | cards produit / catégorie, cards SAV / process, `Dialog`, `Sheet` |
| `rounded-ls-lg` | 16 | image héros fiche produit, modale de recherche, image d'actu |
| `rounded-ls-xl` | 24 | grandes images catégorie de la home |
| `rounded-full` | ∞ | boutons icône ronds, stepper quantité, **pilule CTA**, chips catégorie, pastilles |

Alias compat (mêmes valeurs) : `rounded-ls-btn`=sm, `rounded-ls-input`=sm,
`rounded-ls-card`=md, `rounded-ls-badge`=xs.
Côté shadcn : `--radius-sm/md/lg/xl` sont alignés (`rounded-md` shadcn = 12px).
`--radius` global = `sm` (8px), pour `Button`/`Toggle`.

**Règle** : jamais `border` **et** `shadow` sur le même élément au repos. Filet
(`ring-1` / `border`) pour délimiter à plat ; ombre pour détacher du fond.

---

## Ombres

| Utilitaire | Rôle |
|---|---|
| `shadow-ls-card` | `0 1px 3px /8%` — cards au repos |
| `shadow-ls-card-hover` | `0 4px 12px /12%` — hover desktop des cards (`md:hover:`) |
| `shadow-ls-cta` | `0 4px 14px rgba(184,24,201,.22)` — teinté violet, bouton CTA principal |
| `shadow-ls-showcase` | `0 14px 30px -14px /22%` — portée **vers le bas**, grandes images home |
| `shadow-ls-sheet` | `0 -4px 16px /10%` — bottom sheet (filtres) |

---

## Espacements

Échelle base-8 : `--spacing-ls-1..12` (4 / 8 / 12 / 16 / 24 / 32 / 48 px).
En pratique on utilise surtout les utilitaires Tailwind standards (`p-4`, `gap-4`,
`py-14 md:py-16` pour les sections). Grille produit : `grid-cols-2 gap-4` mobile →
`md:grid-cols-3` → `lg:grid-cols-4`.

---

## Durées & easing (motion)

`--duration-ls-fast 150ms` (hover) · `--duration-ls-base 220ms` (entrées, toast) ·
`--duration-ls-sheet 280ms` · `--duration-ls-slide 260ms` · `--duration-ls-bounce 380ms`
(bump panier).
`--ease-ls-out cubic-bezier(0,0,.2,1)` · `--ease-ls-inout cubic-bezier(.4,0,.2,1)`.
Usage : `duration-[var(--duration-ls-fast)] ease-[var(--ease-ls-out)]`.

---

## Variables non-`@theme` (dans `:root`, globals.css)

`--ls-bottom-nav-h: calc(3.5rem + env(safe-area-inset-bottom, 0px))` — hauteur de
la bottom-nav mobile, pour caler les CTA sticky au-dessus (`bottom-[var(--ls-bottom-nav-h)]`).
