# Typographie

## Polices

- **Inter** — tout le texte. Auto-hébergée via `next/font` (`src/app/fonts.ts`),
  reliée à `--font-ls-sans` dans `globals.css`.
- **Playfair Display** — **le logo uniquement** (`src/components/storefront/layout/logo.tsx`).
  Aucun autre usage autorisé.

## Échelle applicative (`--text-ls-*`)

Shorthand CSS complet (weight/size/line-height/family). S'appliquent en
`[font:var(--text-ls-h1)]` ou via l'utilitaire `text-ls-h1`.

| Token | Valeur | Usage |
|---|---|---|
| `--text-ls-h1` | 500 · 24px / 1.3 | titre de page (fiche produit, catalogue) |
| `--text-ls-h2` | 500 · 18px / 1.4 | sous-titres internes |
| `--text-ls-body` | 400 · 15px / 1.6 | corps de texte (défaut `body`) |
| `--text-ls-label` | 500 · 12px / 1.4 | labels, méta, légendes — **plancher 12px** |
| `--text-ls-price` | 500 · 18px / 1 | prix |

## Échelle de la home (landing — plus grande, assumée)

La home utilise une échelle d'affichage **bespoke**, plus grande que `--text-ls-h1`.
C'est volontaire (page vitrine). Ne pas l'étendre au reste de l'app.

| Rôle | Classes |
|---|---|
| Titre hero (`h1`) | `text-3xl md:text-5xl font-semibold leading-tight text-balance` + couleur `text-ls-violet-hero` + `[text-shadow:0_2px_16px_rgba(0,0,0,0.6)]` |
| Titre de section (`h2`) | `text-[26px] font-semibold leading-tight text-ls-gray-900 text-balance` |
| Titre bloc / carte (`h3`) | `text-[15px]` ou `text-[17px]` `font-semibold leading-snug text-ls-gray-900` |
| Intro sous-titre (lead) | `text-ls-body text-ls-gray-600 max-w-prose` |
| Eyebrow | `text-[11px] font-semibold uppercase tracking-[0.14em] text-ls-violet-dark` |

Ces valeurs sont centralisées dans les constantes `EYEBROW` / `HEADING` / `LEAD`
de `src/components/storefront/home/home-sections.tsx` et dans le composant
`SectionHeader` — **le réutiliser** pour toute nouvelle section (cf.
[sections-and-backgrounds.md](sections-and-backgrounds.md)).

## Couleurs de texte

- Titres / texte fort : `text-ls-gray-900`
- Texte courant sur blanc : `text-ls-gray-600`
- Texte secondaire / méta : `text-ls-gray-500`
- Eyebrow, liens d'action, accents : `text-ls-violet-dark` (hover `text-ls-violet`)
- Sur photo : `text-white` + `[text-shadow:…]` (jamais de texte gris sur image)

## Hiérarchie des titres — règle

Une page = **un seul `<h1>`**. Sections en `<h2>` (via `SectionHeader`), cartes /
articles en `<h3>`. Ne jamais utiliser un `<p>` stylé pour un vrai titre.

## Liens & focus

Liens texte : `text-ls-gray-900 underline-offset-2 hover:text-ls-violet-dark hover:underline`.
Liens d'action (avec flèche) : `inline-flex items-center gap-1.5 text-ls-label font-semibold text-ls-violet-dark hover:text-ls-violet` + `<ArrowRight size={14} />`.
Focus : le `@layer base` de `globals.css` pose un `outline-ring/50` (ring = violet)
sur tout. Ajouter un `focus-visible:ring-2 focus-visible:ring-ls-violet focus-visible:ring-offset-2`
explicite sur les CTA importants (sur photo : `focus-visible:ring-ls-white`).
