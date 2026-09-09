/**
 * src/lib/actions/checkout.ts
 * Agent : Logique métier
 * Rôle  : Tunnel vitrine — crée l'Order en statut `pending_whatsapp`,
 *         génère le lien wa.me avec message pré-rempli incluant /commandes/[id].
 *
 * Contraintes non-négociables :
 *  - Stock NON décrémenté ici (uniquement à confirmed→processing).
 *  - payment_method = champ vitrine uniquement, aucune intégration paiement.
 *  - Prix et libellés TOUJOURS relus en base au moment de la commande — le
 *    panier Redis (influençable côté client) ne fait jamais foi sur le prix.
 *  - Écritures via dbAdmin (RLS bypass requis sur Order/OrderItem).
 */

'use server'

import { dbAdmin, dbAnon } from '@/lib/db/client'
import { orders, orderItems, variants, products } from '@/lib/db/schema'
import { and, eq, inArray } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { buildWhatsappUrl } from '@/lib/whatsapp'
import { getUserId } from '@/lib/auth-guards'
import { getCart, clearCart } from './cart'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface CheckoutInput {
  name:          string
  phone:         string
  email?:        string
  addressJson?:  Record<string, unknown>
  /** Intention de paiement — affichage vitrine uniquement */
  paymentMethod: 'mobile_money_orange' | 'mobile_money_moov' | 'cod'
}

export interface CheckoutResult {
  success:      boolean
  orderId?:     string
  whatsappUrl?: string
  /** Renseigné même en cas de succès partiel (commande créée, lien WA indispo). */
  warning?:     string
  error?:       string
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://louisa.shop'
const PAYMENT_METHODS = ['mobile_money_orange', 'mobile_money_moov', 'cod'] as const

/**
 * createOrder — étape finale du tunnel checkout.
 * 1. Session Better Auth.  2. Panier Redis.  3. Re-résolution prix/libellés
 * en base.  4. Transaction Order + OrderItems.  5. Vide le panier.
 * 6. Lien wa.me.
 */
export async function createOrder(input: CheckoutInput): Promise<CheckoutResult> {
  // ── 1. Auth ───────────────────────────────────
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: 'Session expirée — veuillez vous reconnecter' }
  }

  if (!input?.name?.trim() || !input?.phone?.trim()) {
    return { success: false, error: 'Nom et téléphone requis' }
  }
  if (!PAYMENT_METHODS.includes(input.paymentMethod)) {
    return { success: false, error: 'Mode de paiement invalide' }
  }

  // ── 2. Panier ─────────────────────────────────
  const cart = await getCart()
  if (cart.items.length === 0) {
    return { success: false, error: 'Votre panier est vide' }
  }

  // ── 3. Re-résolution AUTORITAIRE (prix serveur) ───────────────────────────
  const variantIds = [...new Set(cart.items.map((i) => i.variantId))]
  const rows = await dbAnon
    .select({
      variantId:     variants.id,
      sku:           variants.sku,
      size:          variants.size,
      color:         variants.color,
      productName:   products.name,
      priceOverride: variants.priceOverride,
      basePrice:     products.basePrice,
      hasTutorial:   products.hasTutorial,
    })
    .from(variants)
    .innerJoin(products, eq(variants.productId, products.id))
    .where(and(inArray(variants.id, variantIds), eq(products.isActive, true)))

  const byId = new Map(rows.map((r) => [r.variantId, r]))

  const lines = cart.items.map((cartItem) => {
    const r = byId.get(cartItem.variantId)
    if (!r) return null
    const qty = Math.max(1, Math.trunc(cartItem.qty))
    const unitPrice = r.priceOverride ?? r.basePrice
    return {
      variantId:   r.variantId,
      sku:         r.sku,
      productName: r.productName,
      size:        r.size,
      color:       r.color,
      hasTutorial: r.hasTutorial,
      qty,
      unitPrice,
    }
  })

  if (lines.some((l) => l === null)) {
    return {
      success: false,
      error: 'Un article de votre panier n\'est plus disponible — vérifiez votre panier.',
    }
  }
  const items = lines as NonNullable<(typeof lines)[number]>[]
  const total = items.reduce((sum, l) => sum + l.unitPrice * l.qty, 0)

  // ── 4. Transaction Order + OrderItems ─────────
  const orderId = uuidv4()
  try {
    await dbAdmin.transaction(async (tx) => {
      await tx.insert(orders).values({
        id:            orderId,
        customerId:    userId,
        status:        'pending_whatsapp',
        paymentMethod: input.paymentMethod,
        total,
        itemsSnapshot: items.map((l) => ({
          variant_id:          l.variantId,
          sku:                 l.sku,
          product_name:        l.productName,
          size:                l.size ?? null,
          color:               l.color ?? null,
          unit_price_at_order: l.unitPrice,
          qty:                 l.qty,
          has_tutorial:        l.hasTutorial,
        })),
        whatsappRef: null,
      })

      await tx.insert(orderItems).values(
        items.map((l) => ({
          id:        uuidv4(),
          orderId,
          variantId: l.variantId,
          qty:       l.qty,
          unitPrice: l.unitPrice,
        })),
      )
    })
  } catch (err) {
    console.error('[checkout] Transaction échouée', err)
    return { success: false, error: 'Erreur lors de la création de la commande' }
  }

  // ── 5. Vider le panier ────────────────────────
  await clearCart()

  // ── 6. URL WhatsApp ───────────────────────────
  try {
    const whatsappUrl = await buildWhatsappUrl({
      orderId,
      orderUrl:      `${BASE_URL}/commandes/${orderId}`,
      customerName:  input.name.trim(),
      paymentMethod: input.paymentMethod,
      total,
      items: items.map((l) => ({
        productName: l.productName,
        sku:         l.sku,
        size:        l.size,
        color:       l.color,
        qty:         l.qty,
        unitPrice:   l.unitPrice,
      })),
    })
    return { success: true, orderId, whatsappUrl }
  } catch (err) {
    console.error('[checkout] WhatsApp URL', err)
    return {
      success: true,
      orderId,
      warning: 'Numéro WhatsApp non configuré — contactez l\'administrateur.',
    }
  }
}
