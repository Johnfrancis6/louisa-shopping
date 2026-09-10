import { FiltersSheet } from './filters-sheet'
import { SortControl } from './sort-control'
import type { CatalogSort } from '@/types/catalog'
import type { CatalogFacets } from '@/lib/data/products'

/**
 * Barre de contrôle des résultats — au-dessus de la grille produit.
 * Compteur (canonique, se met à jour avec les filtres) · tri · bouton
 * « Filtres » avec pastille count. Composant serveur : seuls `SortControl`
 * et `FiltersSheet` sont clients.
 */
export function CatalogueToolbar({
  total,
  tri,
  activeCount,
  facets,
}: {
  total: number
  tri: CatalogSort
  activeCount: number
  facets: CatalogFacets
}) {
  return (
    <div className="mt-8 flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between md:px-12">
      <div className="flex min-w-0 items-center gap-3">
        <p className="shrink-0 text-ls-label text-ls-gray-600" aria-live="polite">
          {total} produit{total > 1 ? 's' : ''}
        </p>
        <SortControl value={tri} />
      </div>
      <FiltersSheet facets={facets} activeCount={activeCount} />
    </div>
  )
}
