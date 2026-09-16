'use server'

/**
 * src/lib/actions/reviews.ts
 * Soumission d'un avis produit. Tout nouvel avis part en `status = 'pending'`
 * (modération admin) — jamais visible publiquement avant approbation.
 * L'auteur = le client connecté (customer.name), jamais un nom libre.
 */
import { revalidateTag } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { dbAdmin } from '@/lib/db/client'
import { review, customer, products } from '@/lib/db/schema'
import { getUserId, ensureCustomer } from '@/lib/auth-guards'

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

  // Filet de rattrapage : voir src/lib/actions/checkout.ts createOrder — même
  // risque de compte sans profil `customer` (hook post-signup hors transaction).
  const customerCheck = await ensureCustomer()
  if (!customerCheck.ok) {
    return { success: false, error: customerCheck.error }
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
      .where(and(eq(products.id, input.productId), eq(products.isActive, true)))
      .limit(1)
    if (!prod) {
      return { success: false, error: 'Produit introuvable.' }
    }

    // Vérification applicative de doublon : rend un message propre plutôt
    // que de laisser remonter la violation de l'index unique
    // `review_customer_product_uniq` (filet base de données conservé
    // ci-dessous, car la course entre les deux checks reste possible).
    const [existing] = await dbAdmin
      .select({ id: review.id })
      .from(review)
      .where(and(eq(review.customerId, userId), eq(review.productId, input.productId)))
      .limit(1)
    if (existing) {
      return { success: false, error: 'Vous avez déjà laissé un avis sur ce produit.' }
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
    revalidateTag(`reviews:${input.productId}`, { expire: 0 })
    return { success: true }
  } catch (err) {
    console.error('[reviews] createReview', err)
    return { success: false, error: 'Erreur lors de l\'envoi de l\'avis.' }
  }
}
