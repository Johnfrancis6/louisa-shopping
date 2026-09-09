'use server'

/**
 * src/lib/actions/reviews.ts
 * Soumission d'un avis produit. Tout nouvel avis part en `status = 'pending'`
 * (modération admin) — jamais visible publiquement avant approbation.
 * L'auteur = le client connecté (customer.name), jamais un nom libre.
 */
import { revalidateTag } from 'next/cache'
import { eq } from 'drizzle-orm'
import { dbAdmin } from '@/lib/db/client'
import { review, customer, products } from '@/lib/db/schema'
import { getUserId } from '@/lib/auth-guards'

export interface CreateReviewInput {
  productId: string
  rating: number
  comment: string
}

export async function createReview(
  input: CreateReviewInput,
): Promise<{ success: boolean; error?: string }> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: 'Connectez-vous pour laisser un avis.' }
  }

  const rating = Math.trunc(Number(input.rating))
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { success: false, error: 'Note invalide (1 à 5).' }
  }
  const comment = input.comment?.trim() ?? ''
  if (comment.length < 3) {
    return { success: false, error: 'Votre avis est trop court.' }
  }
  if (comment.length > 2000) {
    return { success: false, error: 'Votre avis est trop long (2000 caractères max).' }
  }

  try {
    const [cust] = await dbAdmin
      .select({ id: customer.id, name: customer.name })
      .from(customer)
      .where(eq(customer.id, userId))
      .limit(1)
    if (!cust) {
      return { success: false, error: 'Compte client introuvable.' }
    }

    const [prod] = await dbAdmin
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, input.productId))
      .limit(1)
    if (!prod) {
      return { success: false, error: 'Produit introuvable.' }
    }

    await dbAdmin.insert(review).values({
      productId: input.productId,
      customerId: userId,
      authorName: cust.name,
      rating,
      body: comment,
      status: 'pending',
    })

    // Le tag est réutilisé à l'approbation admin (revalidation de la liste).
    revalidateTag(`reviews:${input.productId}`)
    return { success: true }
  } catch (err) {
    console.error('[reviews] createReview', err)
    return { success: false, error: 'Erreur lors de l\'envoi de l\'avis.' }
  }
}
