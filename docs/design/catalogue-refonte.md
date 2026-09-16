# Refonte `/catalogue` — journal & reprise

Étapes 1–5 : branche `test/ci`, session 2026-09-09.
Étape 6 : branche `fix/backend-audit-livraison`, audit frontend bloc 3,
2026-09-16 — **committée**. `npm run verify` vert après chaque étape.

Suite de la refonte design du storefront (la home `/` est la référence de
cohérence). Voir [README.md](README.md) et [new-page-checklist.md](new-page-checklist.md).

---

## Décisions produit / design (validées)

| Sujet | Choix |
|---|---|
| **En-tête** | Filet d'accent violet + eyebrow « Parcourir » + `h1` fixe « Catalogue » + sous-titre conditionnel « {Catégorie} · {N} produits » quand `?categorie=` actif |
| **Grille catégories** | Garder les tuiles (image + « N articles »), restylées aux tokens : actif `border-ls-violet bg-ls-violet-bg`, hover `border-ls-violet-tint` |
| **Toolbar** | Compteur « N produits » (canonique, suit les filtres) + menu « Trier ▾ » + bouton « Filtres » avec pastille count. Au-dessus de la grille. |
| **Tri** | `<select>` natif à côté de « Filtres » (pas dans le sheet). Nouveautés (défaut) / Prix croissant / Prix décroissant / Nom A–Z. Param `?tri=` (`nouveaute` non sérialisé). Tri mémoire, stable, après filtrage. |
| **Filtre prix** | Plus de slider → `<select>` **5 tranches** : `<10k` / `10–25k` / `25–50k` / `50–100k` / `>100k` FCFA. Mappées sur `prixMin`/`prixMax`. |
| **FiltersSheet** | `side="right"` (sidebar pleine hauteur), plus `side="bottom"`. Footer : « Réinitialiser » + « Voir les résultats ». |
| **Chips de filtres actifs** | Sous la toolbar. Une chip par prix / couleur / taille / stock, retrait granulaire (params préservés). « Tout effacer » garde `categorie` + `tri`. Catégorie **non** chipée (portée par sous-titre + tuile active). |

Bornes des tranches de prix : proposées d'après la démo (6 500 → 285 000 F),
**à confirmer** avec le marchand → sinon `[À COMPLÉTER]`.

---

## Étapes livrées

### 1 — Couche données
- `src/types/catalog.ts` : `CatalogSort` + `CatalogFilters.tri`.
- `src/lib/utils/catalog-filters.ts` : `parse`/`toSearchParams` gèrent `tri` ;
  nouveau `countActiveFilters()` (prix/couleur/taille/stock — pas catégorie ni tri).
- `src/lib/data/products.ts` : `getProducts` renvoie `total` ; helpers
  `minPriceOf` + `sortProducts` (tri mémoire après filtrage, avant pagination).

### 2 — Coquille de page + en-tête
- `src/app/(storefront)/catalogue/page.tsx` : conteneur `mx-auto max-w-6xl`,
  rythme `pt-8 md:pt-10`, en-tête filet + eyebrow + `h1` + `CatalogueHeaderMeta`
  (sous-titre `{Catégorie} · {N} produits`, `null` si pas de catégorie).

### 3 — Toolbar
- `src/components/storefront/catalogue/catalogue-toolbar.tsx` (**serveur**) :
  rangée compteur + `SortControl` + `FiltersSheet`. S'empile sur mobile
  (`flex-col` → `sm:flex-row`) — sinon le bouton Filtres partait hors écran.
- `src/components/storefront/catalogue/sort-control.tsx` (**client**) : `<select>`
  natif stylé, écrit `?tri=` en préservant les autres params.
- `filters-sheet.tsx` : prop `activeCount` + pastille `rounded-full bg-ls-violet`.
- `page.tsx` : `CatalogueResults` fait un seul `Promise.all` (`getProducts` +
  `getCatalogFacets`), rend toolbar + grille ; label « Produits » → `<h2 sr-only>`.

### 4 — Chips de filtres actifs
- `src/components/storefront/catalogue/active-filters.tsx` (**client**, `null` si
  vide) : chips pilule `rounded-full h-9` + `X`, `aria-label` explicite ;
  « Tout effacer » (lien violet).

### 5 — CategoryGrid + FiltersSheet
- `category-grid.tsx` : `<h2>` « Catégories » ; tuile active/hover en violet ;
  skeleton + ligne count.
- `filters-sheet.tsx` : `side="right"` ; `PRICE_BRACKETS` + `<select>` (slider
  supprimé) ; `bracketFor()` re-sélectionne à l'ouverture ; **`apply()` propage
  `tri`** (bug : le tri était perdu à chaque filtre) ; bouton « Réinitialiser ».

---

## Étape 6 — LIVRÉE (audit frontend bloc 3, 2026-09-16)

Fichiers : `catalogue/page.tsx`, `catalogue/product-grid.tsx`.
Les quatre points sont traités (le 4ᵉ partiellement — voir ci-dessous).

1. ✅ **Skeleton produit calqué sur la vraie card.** `CatalogueResultsSkeleton`
   reproduit maintenant nom → image `aspect-square` → ligne prix + bouton rond,
   et la toolbar s'y empile sous `sm:` comme la vraie. L'ancien bloc
   `aspect-[3/4]` décalait la page à l'arrivée du contenu.
2. ✅ **État vide** (`ProductGrid`) : carte bordée façon carte SAV — icône encre
   `size={28}`, message distinct selon qu'il y a des filtres ou non, et un lien
   **« Réinitialiser les filtres »** quand il y en a. C'est un `<Link>`, pas un
   bouton : l'URL cible se reconstruit depuis `filters` via
   `catalogFiltersToSearchParams` (`categorie` et `tri` conservés), donc sans
   dupliquer `FILTER_PARAMS` ni passer par le client.
3. ✅ **A11y scroll infini** (`ProductGrid`) : région `role="status"
   aria-live="polite"` annonçant le nombre de produits affichés, et vrai bouton
   **« Charger plus de produits »** en complément de l'`IntersectionObserver`.
4. ⚠️ **État d'erreur** (partiel) : un échec de **pagination** est désormais
   rattrapé (le bouton passe à « Réessayer »). En revanche `getProducts` catch
   toujours → `{ items: [], total: 0 }`, donc un échec du **premier** chargement
   reste indistinguable de « aucun résultat ». Il faudrait un flag `error` au
   retour de `getProducts` — non fait, ça touche la couche données.

Écarts trouvés en plus pendant l'audit, corrigés au passage :

- Le **skeleton de la grille de catégories** omettait le titre « Catégories » :
  l'arrivée du vrai contenu poussait toute la page.
- Le **panneau de filtres gardait un état périmé**. Ses `useState` ne lisaient
  l'URL qu'au montage et il ne se démonte pas : retirer un filtre par une chip
  puis rouvrir le panneau réaffichait l'ancienne sélection, que « Voir les
  résultats » réappliquait — le retrait était annulé. Le panneau est maintenant
  contrôlé et se re-synchronise à chaque ouverture. (Le présent journal affirmait
  que `bracketFor()` « re-sélectionne à l'ouverture » : c'était faux, un
  `useState(initial)` ne se réévalue pas.)
- **Double chargement possible** au défilement : la garde était `isPending`, lu
  dans la closure de l'observateur. Passée en `ref`.
- Les **chips passent de `h-9` à `h-11`** (voir la note de dette ci-dessous).

---

## Notes / dette

- ~~**`src/app/globals.css`** : un commentaire contenant `rounded-[--radius-ls-md]`
  était scanné par Tailwind et compilait une règle cassée.~~ **Résolu** par le
  `source("../")` de `globals.css`, qui restreint le scan à `src/`.
  `grep -c "border-radius:--radius" .next/static/chunks/*.css` → 0.
- ~~Chips à `h-9` (36 px)~~ **Résolu** : passées à `h-11`. La justification
  (« cohérent avec les autres contrôles de filtre ») ne tenait pas — le tri, le
  bouton « Filtres » et les toggles du panneau sont tous à `h-11`. Les chips
  étaient donc à la fois sous le plancher tactile et incohérentes.
- `SortControl` et le `<select>` prix du sheet dupliquent le markup `<select> +
  ChevronDown` → extraire un `<SelectField>` présentational si un 3ᵉ apparaît.
- ~~Docs design à mettre à jour en fin de refonte.~~ **Fait** : `components.md`
  porte la tuile catégorie active en violet, l'anatomie du panneau de filtres
  latéral, les contrôles à `h-11`, l'état vide et le chargement de la suite.
  `shadow-ls-sheet` reste décrit dans `tokens.md` comme un token de bottom sheet —
  il n'est plus utilisé par le panneau de filtres, devenu latéral. À supprimer ou
  à réaffecter le jour où plus rien ne monte du bas.

---

## Reprise rapide

```bash
npm run verify
grep -c "border-radius:--radius" .next/static/chunks/*.css   # attendu 0
grep -o "\.text-ls-h1{[^}]*}" .next/static/chunks/*.css     # doit dire font:, pas font-size:
grep -rn "À COMPLÉTER" src/
```
