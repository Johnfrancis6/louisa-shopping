import { cacheLife, cacheTag } from 'next/cache'
import { and, desc, eq } from 'drizzle-orm'
import { dbAnon } from '@/lib/db/client'
import { review, customer } from '@/lib/db/schema'
import type { Review } from '@/types/catalog'

/**
 * Avis APPROUVÉS d'un produit (les seuls exposés à dbAnon — policy
 * `review_public_read_approved`). L'auteur affiché = customer.name.
 */
export async function getApprovedReviews(productId: string): Promise<Review[]> {
  'use cache'
  cacheLife('minutes')
  cacheTag(`reviews:${productId}`)

  try {
    const rows = await dbAnon
      .select({
        id: review.id,
        productId: review.productId,
        author: customer.name,
        rating: review.rating,
        comment: review.body,
        status: review.status,
        createdAt: review.createdAt,
      })
      .from(review)
      .innerJoin(customer, eq(review.customerId, customer.id))
      .where(and(eq(review.productId, productId), eq(review.status, 'approved')))
      .orderBy(desc(review.createdAt))

    return rows.map((r) => ({
      id: r.id,
      productId: r.productId,
      author: r.author,
      rating: Math.min(5, Math.max(1, r.rating)) as Review['rating'],
      comment: r.comment ?? '',
      status: 'approved',
      createdAt: r.createdAt.toISOString(),
    }))
  } catch (err) {
    console.error('[data/reviews] getApprovedReviews', err)
    return []
  }
}
