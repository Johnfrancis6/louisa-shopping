# Sections & fonds

## `SectionHeader` — à réutiliser partout

Exporté par `src/components/storefront/home/home-sections.tsx` :

```tsx
<SectionHeader
  eyebrow="Comment ça marche"
  heading="Commander, c’est trois étapes."
  lead="Phrase d'intro optionnelle."   // omissible
/>
```

Rend : filet d'accent violet (`h-[3px] w-8`) → eyebrow (`text-[11px]/700 uppercase
tracking-[0.14em] text-ls-violet-dark`) → `<h2>` (`text-[26px]/600 text-ls-gray-900
text-balance`) → lead (`text-ls-body text-ls-gray-600 max-w-prose`).

Toute nouvelle section de contenu doit l'utiliser (ou le même pattern).

## Structure type d'une section

```tsx
<section id="…" className="bg-… border-t border-ls-gray-200 px-4 py-14 md:px-12 md:py-16">
  <div className="mx-auto max-w-5xl">
    <SectionHeader … />
    <div className="mt-8 …">{/* contenu */}</div>
  </div>
</section>
```

- Padding vertical : `py-14 md:py-16`. Padding horizontal : `px-4 md:px-12`.
- Largeur de contenu : `max-w-5xl` (contenu dense) ou `max-w-[640px]` (colonne
  éditoriale, ex. showcase).
- `border-t border-ls-gray-200` quand deux sections voisines ont **le même fond**.

## Rythme des fonds (home)

| Section | Fond | Texture |
|---|---|---|
| Hero | photo + dégradé `from-black/70` | — |
| Nos boutiques (showcase) | `bg-ls-white` | — |
| Process | `bg-ls-violet-bg` + `.ls-glow` en haut | lueur violette |
| SAV | `bg-ls-white` + `border-t` | `.ls-dots` |
| Actualités | `bg-ls-gray-50` + `border-t` | — |
| Footer | `bg-ls-white` + `border-t` | `.ls-dots` |

Alterner blanc / teinte, jamais deux teintes fortes qui se suivent.

## Texture — sobre, définie dans `globals.css`

- **Grain global** : `body::after` — bruit fractal SVG, `position:fixed`,
  `opacity:0.022`, `z-index:100`, `pointer-events:none`. Masqué à l'impression.
  Ne pas augmenter l'opacité.
- **`.ls-dots`** : trame de points `radial-gradient(circle at 1px 1px,
  var(--color-ls-gray-200) 1px, transparent 0)` / `background-size:22px 22px`.
  Sur les sections claires qui ont besoin d'un léger relief (SAV, footer). Les
  cards blanches par-dessus masquent les points → relief seulement dans les marges.
- **`.ls-glow`** : `radial-gradient(60% 120% at 50% 0%, var(--color-ls-violet-tint)
  0%, transparent 70%)`. Halo décoratif en haut d'une section (Process). À poser
  dans un `<div class="ls-glow pointer-events-none absolute inset-x-0 -top-32 h-72"
  aria-hidden />` avec parent `relative overflow-hidden`.

## Skeletons

`.ls-skeleton` (shimmer, `globals.css`) pour le chargement. **Inclure l'en-tête de
section** dans le skeleton pour éviter le décalage de mise en page quand le vrai
contenu arrive (cf. `CategoryShowcaseSkeleton`).

## `ls-reveal` — apparition au scroll

Classe CSS pure (scroll-driven, `animation-timeline: view()`), voir [motion.md](motion.md).
À poser sur les éléments répétés qui entrent par le bas (cards produit, tuiles,
blocs catégorie). **Jamais** sur un élément visible au premier écran sans scroll.
