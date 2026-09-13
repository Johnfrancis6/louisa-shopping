'use server'

/**
 * Frontière RPC pour la pagination infinie du catalogue (appelée depuis le
 * composant client <ProductGrid>). La logique de lecture + cache vit dans
 * src/lib/data/products.ts.
 *
 * `getProducts` est `'use cache'` : ses arguments entrent dans la clé de
 * cache. Comme ils arrivent tels quels du client, on les normalise ICI, à la
 * frontière — sinon n'importe qui peut faire enfler le store de cache avec
 * des filtres bidon.
 */
import { getProducts } from '@/lib/data/products'
import {
  normalizeCatalogFilters,
  normalizeCatalogCursor,
} from '@/lib/utils/catalog-filters'
import type { CatalogFilters } from '@/types/catalog'

export async function loadMoreProducts(filters: CatalogFilters, cursor: string) {
  return getProducts(normalizeCatalogFilters(filters), normalizeCatalogCursor(cursor))
}
