# Refonte `/catalogue` — journal & reprise

Branche `test/ci`. Session 2026-09-09. **Non committé.** `npm run verify` vert
après chaque étape.

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

## Étape 6 — RESTE À FAIRE

Fichiers : `catalogue/page.tsx`, `catalogue/product-grid.tsx`, éventuellement
`catalogue/product-card.tsx`.

1. **Skeleton produit calqué sur la vraie card.** `CatalogueResultsSkeleton`
   utilise encore `aspect-[3/4]` → ne correspond pas à la card réelle
   (nom + SKU en tête → image carrée `aspect-square` → ligne prix + bouton rond).
   Reproduire cette structure pour supprimer le saut de mise en page.
2. **État vide** (`ProductGrid`, `items.length === 0`) : actuellement un `<p>`
   centré. Ajouter une icône (encre, `size={28}`), un message, et — si des
   filtres sont actifs — un bouton **« Réinitialiser les filtres »** (réutiliser
   la logique `FILTER_PARAMS` de `active-filters.tsx`, à extraire dans
   `catalog-filters.ts`). Style proche des cartes SAV de la home.
3. **A11y scroll infini** (`ProductGrid`) : la sentinelle est `aria-hidden`,
   « Chargement… » est un `<p>` nu. Ajouter `aria-live="polite"` sur la zone de
   statut + un vrai bouton **« Charger plus de produits »** (déclenchable au
   clavier) en complément de l'`IntersectionObserver`.
4. **État d'erreur** (optionnel) : `getProducts` catch → `{ items: [], total: 0 }`,
   indistinguable de « aucun résultat ». Ajouter un flag `error` au retour si on
   veut différencier le message.

---

## Notes / dette

- **`src/app/globals.css` (working tree, hors périmètre)** : un commentaire
  contient la chaîne littérale `rounded-[--radius-ls-md]` → Tailwind v4 la scanne
  et compile `border-radius:--radius-ls-md` (cassé) dans le CSS. Le HEAD écrivait
  `rounded-[--radius-ls-*]` (avec `*`). `grep "border-radius:--radius"
  .next/static/**/*.css` → 1. À reformuler par l'auteur de la refonte
  `globals.css`.
- Chips à `h-9` (36 px) : sous le plancher tactile 44 px du checklist, mais
  cohérent avec les autres contrôles de filtre. À confirmer.
- `SortControl` et le `<select>` prix du sheet dupliquent le markup `<select> +
  ChevronDown` → extraire un `<SelectField>` présentational si un 3ᵉ apparaît.
- Docs design à mettre à jour en fin de refonte : `layout-and-chrome.md` +
  `components.md` + `tokens.md` (`shadow-ls-sheet`) pour la sidebar filtres ;
  `components.md` pour la tuile catégorie active (violet, plus `border-ls-gray-900`).

---

## Reprise rapide

```bash
npm run verify
grep -rc "border-radius:--radius" .next/static/**/*.css   # attendu 0 (voir dette globals.css)
grep -rn "À COMPLÉTER" src/
```
