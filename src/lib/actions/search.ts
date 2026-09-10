'use server'

/**
 * Frontière RPC pour la modale de recherche (command-palette) côté client.
 * Lecture + cache dans src/lib/data/*. Renvoie un jeu de résultats compact
 * (produits + catégories correspondantes, avec compteur d'articles).
 */
import { searchProducts } from '@/lib/data/products'
import { getCategories, getCategoryProductCounts } from '@/lib/data/categories'
import type { Category, Product } from '@/types/catalog'

export type SearchCategory = Pick<Category, 'id' | 'slug' | 'name' | 'image_url'> & {
  count: number
}

export type SearchResults = {
  products: Product[]
  categories: SearchCategory[]
}

const MAX_PRODUCTS = 6
const MAX_CATEGORIES = 4

export async function searchStorefront(query: string): Promise<SearchResults> {
  const q = query.trim()
  if (q.length < 2) return { products: [], categories: [] }

  const [products, allCategories, counts] = await Promise.all([
    searchProducts(q),
    getCategories(),
    getCategoryProductCounts(),
  ])

  const needle = q.toLowerCase()
  const categories = allCategories
    .filter((c) => c.name.toLowerCase().includes(needle))
    .slice(0, MAX_CATEGORIES)
    .map(({ id, slug, name, image_url }) => ({
      id,
      slug,
      name,
      image_url,
      count: counts[id] ?? 0,
    }))

  return { products: products.slice(0, MAX_PRODUCTS), categories }
}
