import { cacheLife, cacheTag } from 'next/cache'
import { asc, eq } from 'drizzle-orm'
import { dbAnon } from '@/lib/db/client'
import { category } from '@/lib/db/schema'
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

  try {
    const rows = await dbAnon
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

    return rows
  } catch (err) {
    console.error('[data/categories] getCategories', err)
    return []
  }
}
