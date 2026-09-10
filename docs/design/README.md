# Design storefront — Louisa Shopping

Langage visuel du **storefront** (client). L'admin est hors périmètre (il garde son
indigo et sa propre densité).

> Cette doc décrit l'état livré après les phases de refonte 2026-09 (branche
> `test/ci`). Source de vérité = le code. Si un écart apparaît, le code gagne et
> cette doc doit être corrigée.

## En une phrase

Mobile-first, **sobre et minimaliste**, monochrome encre/gris + **un accent violet
`#B818C9`** + **le vert WhatsApp `#25D366` réservé** au bouton de confirmation de
commande. Grain global très léger, rayons doux, une seule échelle de tout.

## Les 6 décisions non négociables

1. **Couleur primaire = violet `#B818C9`** (token `--color-ls-violet`, mappé sur
   `--primary`). Tous les boutons d'action primaires sont violets.
2. **Vert WhatsApp `#25D366` = uniquement** le bouton « Confirmer sur WhatsApp »
   (`commandes/[id]`). Jamais ailleurs. → [content-and-copy.md](content-and-copy.md)
3. **Une seule échelle de rayons** : `xs 4 / sm 8 / md 12 / lg 16 / xl 24 / full`.
   Utilisée via `rounded-ls-*` (jamais `rounded-lg` brut). → [tokens.md](tokens.md)
4. **Pas de Framer Motion.** Animations = CSS + `tw-animate-css` + `data-*`
   base-ui. → [motion.md](motion.md)
5. **Tailwind v4 : `rounded-[--radius-ls-md]` est cassé** (rend des coins carrés).
   Toujours `rounded-ls-md`, ou `-[var(--…)]` pour les tokens sans utilitaire.
   → [tokens.md § piège](tokens.md#piège-tailwind-v4)
6. **Contenu = brouillon.** Les faits durs (coordonnées, dates, prix, ville,
   mentions légales) restent `[À COMPLÉTER]`. → [content-and-copy.md](content-and-copy.md)

## Fichiers

| Fichier | Contenu |
|---|---|
| [tokens.md](tokens.md) | Couleurs, rayons, ombres, espacements, durées + le piège Tailwind v4 |
| [typography.md](typography.md) | Polices, échelle typo, patterns eyebrow / heading / lead |
| [layout-and-chrome.md](layout-and-chrome.md) | Layout storefront, navbar, drawer, bottom-nav, footer, modale de recherche, `--ls-bottom-nav-h` |
| [components.md](components.md) | Boutons, cards, inputs, badges, anatomie de la modale de recherche |
| [sections-and-backgrounds.md](sections-and-backgrounds.md) | Rythme des sections home, texture (grain / `ls-dots` / `ls-glow`), `SectionHeader` |
| [motion.md](motion.md) | Approche animation, `ls-reveal`, transitions de page, hover / press, reduced-motion |
| [content-and-copy.md](content-and-copy.md) | Ton, français, placeholders, map d'accroches catégories |
| [new-page-checklist.md](new-page-checklist.md) | Checklist pour créer une nouvelle page cohérente |

## Fichiers-clés du code

```
src/app/design-system.css              tokens (@theme) — source unique
src/app/globals.css                    mapping shadcn↔tokens + texture + keyframes
src/app/(storefront)/layout.tsx        chrome (navbar + footer + bottom-nav + SearchProvider)
src/app/(storefront)/template.tsx      transition d'entrée de page
src/app/(storefront)/page.tsx          home
src/components/storefront/home/        hero, category-showcase, home-sections
src/components/storefront/layout/      navbar, nav-drawer, mobile-bottom-nav, footer, logo, cart-badge
src/components/storefront/search/      search-modal (command-palette)
src/components/storefront/catalogue/   product-card, category-grid, product-grid, filters-sheet
src/components/storefront/product/     product-purchase-experience (+ Lightbox)
src/components/ui/                      shadcn/base-ui (button, dialog, sheet, toggle…)
```

## État par page

| Page | État |
|---|---|
| `/` (home) | **Refaite + auditée.** Référence de cohérence. |
| `/catalogue` | Grille de catégories + grille produits. Restylé (tokens, rayons). Pas de refonte éditoriale. |
| `/produits/[slug]` | Fiche restylée (cadre image, filets, miniatures couleur, CTA pilule violette, lightbox). |
| `/panier`, `/recherche`, `/compte`, auth | Restylés au niveau tokens/rayons/couleurs. Pas de refonte. |
| `/commander` (checkout) | Seulement le retrait de l'indigo. **À refondre.** |

## Vérif avant de livrer

```bash
npm run verify   # = lint + typecheck + build
```

Pas de framework de test. Le build est le garde-fou. Vérifier aussi dans le CSS
compilé qu'il ne reste **aucun** `border-radius:--radius` (= syntaxe cassée) :

```bash
grep -rc "border-radius:--radius" .next/static/**/*.css   # doit être 0
```
