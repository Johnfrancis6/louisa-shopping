'use server'

/**
 * Frontière RPC pour la pagination infinie du catalogue (appelée depuis le
 * composant client <ProductGrid>). La logique de lecture + cache vit dans
 * src/lib/data/products.ts.
 */
import { getProducts } from '@/lib/data/products'
import type { CatalogFilters } from '@/types/catalog'

export async function loadMoreProducts(filters: CatalogFilters, cursor: string) {
  return getProducts(filters, cursor)
}
