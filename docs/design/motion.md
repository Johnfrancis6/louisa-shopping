# Animations

## Principe

**Pas de Framer Motion** (absent de `package.json`, ne pas l'ajouter).
Palette : **CSS transitions/keyframes** + **`tw-animate-css`** (`animate-in`,
`fade-in`, `zoom-in-*`, `slide-in-from-*`) + les attributs **`data-starting-style`
/ `data-ending-style` de `@base-ui/react`**.

Objectif : **fluidité perçue, pas spectacle**. Sobre.
Tout est neutralisé sous `prefers-reduced-motion` — la règle globale de
`design-system.css` met `transition-duration`/`animation-duration` à ~0 ; utiliser
aussi `motion-safe:` pour les animations en boucle (chevron hero).

## Durées (une par famille)

| Famille | Token | ms |
|---|---|---|
| hover / press | `--duration-ls-fast` | 150 |
| entrées (page, toast, modale) | `--duration-ls-base` | 220 |
| bottom sheet | `--duration-ls-sheet` | 280 |
| feedback (bump panier) | `--duration-ls-bounce` | 380 |

Écriture : `duration-[var(--duration-ls-fast)] ease-[var(--ease-ls-out)]`.
**Jamais `transition-all`** — lister les propriétés :
`transition-[transform,background-color,box-shadow]`.

## Inventaire

| Interaction | Où | Comment |
|---|---|---|
| **Transition de page** | `(storefront)/template.tsx` | `animate-in fade-in slide-in-from-bottom-1 duration-[var(--duration-ls-base)] ease-[var(--ease-ls-out)]` |
| **Apparition au scroll** | classe `.ls-reveal` (globals.css) | `@keyframes ls-reveal` (opacity 0→1, translateY 8px→0) + `animation-timeline: view()` + `animation-range: entry 0% cover 18%`. Sous `@supports` + `@media (prefers-reduced-motion: no-preference)`. Dégrade en « simplement visible ». |
| **Ouverture modale / sheet** | base-ui `data-starting-style` + tw-animate-css | overlay `fade-in-0` ~120 ms ; panneau `fade-in-0 zoom-in-95 slide-in-from-top-2` ~150 ms |
| **Hover card (desktop)** | product-card | `md:hover:-translate-y-0.5 md:hover:shadow-ls-card-hover` |
| **Hover image catégorie** | category-showcase | `md:group-hover:scale-[1.03]` sur l'`<Image>` (parent `overflow-hidden`) |
| **Press bouton rond / CTA** | product-card, fiche | `hover:scale-105 active:scale-95` (rond) · `active:scale-[0.98]` (pilule) |
| **Bump badge panier** | cart-badge | `key={count}` + `animate-in zoom-in-50 duration-[var(--duration-ls-bounce)]` (remonte à chaque changement de compte) |
| **Chevron « scroll »** | hero (mobile) | `motion-safe:animate-bounce`, `text-white/60`, `aria-hidden` |
| **Skeleton** | `.ls-skeleton` | shimmer `ls-shimmer` 1200 ms |

## Règle « visible au repos »

Un élément visible au **premier écran** (sans scroll) doit être à `opacity: 1` au
repos. `.ls-reveal` est OK car les éléments déjà dans le viewport au chargement
sont à 100 % de progression de `view()`. Ne jamais parquer un élément à
`opacity: 0` en attendant un observer / un scroll.
