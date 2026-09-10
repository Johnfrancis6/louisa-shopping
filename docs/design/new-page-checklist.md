# Checklist — nouvelle page / section storefront

À suivre pour rester cohérent avec la home.

## 1. Structure

- [ ] La page vit dans `src/app/(storefront)/` (hérite navbar + footer + bottom-nav).
- [ ] **Un seul `<h1>`**. Sections en `<h2>` via `<SectionHeader>`. Cartes en `<h3>`.
- [ ] Section = `<section className="bg-… px-4 py-14 md:px-12 md:py-16">` +
      `<div className="mx-auto max-w-5xl">`.
- [ ] `border-t border-ls-gray-200` si la section précédente a le même fond.
- [ ] Rythme de fond : alterner `bg-ls-white` / teinte, jamais deux teintes fortes
      consécutives. Poser le fond explicitement (le défaut layout est `ls-gray-50`).

## 2. Couleurs

- [ ] Boutons primaires : `bg-ls-violet … hover:bg-ls-violet-dark` (ou `<Button>`).
- [ ] `#25D366` ? Seulement si c'est le bouton « Confirmer sur WhatsApp ».
- [ ] Zéro `neutral-*` / `indigo-*` / `red-*` / `green-*` brut → tokens `ls-*`.
- [ ] Texte : `ls-gray-900` (fort) · `ls-gray-600` (courant) · `ls-gray-500` (méta)
      · `ls-violet-dark` (accent / liens d'action).

## 3. Rayons / bordures

- [ ] `rounded-ls-{xs,sm,md,lg,xl}` ou `rounded-full` — **jamais** `rounded-lg`
      brut ni `rounded-[--radius-ls-md]` (cassé).
- [ ] Cards : `rounded-ls-md`. Grandes images : `rounded-ls-lg`/`xl`. Inputs : `sm`.
- [ ] Filet **OU** ombre, pas les deux au repos.

## 4. Typo

- [ ] `<SectionHeader eyebrow heading lead? />` pour l'en-tête.
- [ ] Filet d'accent violet (`h-[3px] w-8`) présent (inclus dans `SectionHeader`).
- [ ] Corps en `text-ls-body` (défaut). Labels/méta ≥ 12px.

## 5. Interactions / a11y

- [ ] Cibles tactiles ≥ 44px sur mobile.
- [ ] `focus-visible:ring-2 focus-visible:ring-ls-violet focus-visible:ring-offset-2`
      sur les CTA importants (sur photo : `ring-ls-white`).
- [ ] Blocs cliquables = **un vrai `<Link>`** englobant (pas juste un bouton à
      côté d'une image inerte). `aria-label` explicite si le contenu visible ne
      suffit pas.
- [ ] `usePathname()` / `cookies()` / `headers()` → isolés sous `<Suspense>`
      (obligatoire avec `cacheComponents`).
- [ ] Images : `next/image` avec `sizes`, `alt` (vide si décoratif), `priority`
      seulement pour le LCP.

## 6. Motion

- [ ] Pas de Framer Motion. `.ls-reveal` sur les éléments répétés qui entrent par
      le bas. Rien parqué à `opacity:0` au premier écran.
- [ ] `transition-[props listées]`, jamais `transition-all`.
      `duration-[var(--duration-ls-fast)]` pour le hover.

## 7. CTA sticky bas de page (fiche produit, etc.)

- [ ] `fixed inset-x-0 bottom-[var(--ls-bottom-nav-h)] z-30 … md:static md:bottom-auto`.
- [ ] Réserver l'espace du contenu : `pb-40 md:pb-0` (ou padding équivalent).

## 8. Contenu

- [ ] Copie rédigée en brouillon FR (vouvoiement, contexte BF/WhatsApp).
- [ ] Faits durs → `[… — À COMPLÉTER]` ou `href="#"`. Ne rien inventer.

## 9. Vérif

```bash
npm run verify                                            # lint + typecheck + build
grep -rc "border-radius:--radius" .next/static/**/*.css   # = 0
grep -rn "À COMPLÉTER" src/                                # ce qu'il reste à remplir
```
