import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import { asc, count, eq } from 'drizzle-orm'
import { dbAnon } from '@/lib/db/client'
import { withFallback } from './resilient'
import { category, products } from '@/lib/db/schema'
import type { Category } from '@/types/catalog'

/**
 * Catégories visibles, triées par position croissante (fallback alphabétique).
 * RLS : `category_public_read` n'expose que visible = true à dbAnon — le
 * filtre explicite ici est une redondance de clarté.
 */
export async function getCategories(): Promise<Category[]> {
  'use cache'
  cacheLife('hours')
  cacheTag('categories')

  // PAS de try/catch. Lecture critique, et le profil `hours` a un `expire` d'UN
  // JOUR : un `[]` rattrapé ici effaçait la grille de catégories pour vingt-
  // quatre heures. C'est le repli le plus coûteux de toute la couche data.
  // Voir ./resilient.ts.
  return dbAnon
    .select({
      id: category.id,
      slug: category.slug,
      name: category.name,
      bg_color: category.bgColor,
      image_url: category.imageUrl,
      position: category.position,
      visible: category.visible,
      parent_id: category.parentId,
    })
    .from(category)
    .where(eq(category.visible, true))
    .orderBy(asc(category.position), asc(category.name))
}

/**
 * Nombre de produits actifs par catégorie — `{ [categoryId]: n }`.
 * Sert aux compteurs « N articles » (grille catalogue, modale de recherche).
 */
export async function getCategoryProductCounts(): Promise<Record<string, number>> {
  return withFallback('getCategoryProductCounts', getCategoryProductCountsCached, {})
}

/** Lecture ACCESSOIRE : un compteur à 0 est moins grave qu'une page perdue. */
async function getCategoryProductCountsCached(): Promise<Record<string, number>> {
  'use cache'
  cacheLife('minutes')
  cacheTag('categories', 'products', 'stock')

  const rows = await dbAnon
    .select({ categoryId: products.categoryId, n: count() })
    .from(products)
    .where(eq(products.isActive, true))
    .groupBy(products.categoryId)

  const map: Record<string, number> = {}
  for (const row of rows) map[row.categoryId] = Number(row.n)
  return map
}
