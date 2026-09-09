/**
 * src/lib/actions/orders.ts
 * Agent : Logique métier
 * Rôle  : Toutes les transitions Order.status, mutations StockLedger, revalidateTag().
 *
 * Diagramme d'états (contrat §F v2.5) :
 *   pending_whatsapp → confirmed       (admin uniquement)
 *   confirmed        → processing      (admin — décrémente StockLedger reason='order')
 *   confirmed        → cancelled       (admin — aucun stock à recréditer, jamais décrémenté)
 *   processing       → shipped         (admin)
 *   processing       → cancelled       (admin — recrédite StockLedger reason='cancellation')
 *   shipped          → delivered       (admin — validation manuelle)
 *   shipped          → cancelled       (admin — recrédite StockLedger reason='return')
 *
 * Règles strictes :
 *  - StockLedger décrémenté UNIQUEMENT à confirmed→processing.
 *  - revalidateTag() appelé UNIQUEMENT ici (jamais depuis UI ni Admin directement).
 *  - dbAdmin pour tout (mutations ET lectures) : `order`/`order_item`/
 *    `stock_ledger` sont deny-by-default pour dbAnon. Le scoping propriétaire
 *    est explicite (customerId === session.user.id).
 *  - Aucune logique de paiement réel.
 */

'use server'

import { revalidateTag }  from 'next/cache'
import { dbAdmin }        from '@/lib/db/client'
import type { OrderStatus } from '@/lib/db/schema'
import { getAdminUserId, getUserId } from '@/lib/auth-guards'
import {
  orders,
  orderItems,
  stockLedger,
  variants,
}                         from '@/lib/db/schema'
import { eq, and, gte, sql } from 'drizzle-orm'
import { v4 as uuidv4 }  from 'uuid'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

// OrderStatus importé depuis @/lib/db/client (ré-export schema.ts)

export interface ActionResult {
  success: boolean
  error?:  string
}

type TransitionHandler = () => Promise<ActionResult>
type TransitionMatrix = Partial<Record<OrderStatus, Partial<Record<OrderStatus, TransitionHandler>>>>

// ─────────────────────────────────────────────
// Helpers authorization
// ─────────────────────────────────────────────

async function requireAdmin(): Promise<{ userId: string } | ActionResult> {
  const userId = await getAdminUserId()
  if (!userId) return { success: false, error: 'Accès refusé' }
  return { userId }
}

async function requireSession(): Promise<{ userId: string } | ActionResult> {
  const userId = await getUserId()
  if (!userId) return { success: false, error: 'Session expirée' }
  return { userId }
}

function isActionResult(v: unknown): v is ActionResult {
  return typeof v === 'object' && v !== null && 'success' in v
}

// ─────────────────────────────────────────────
// Helper StockLedger + revalidateTag
// ─────────────────────────────────────────────

/**
 * Écrit toutes les entrées StockLedger pour un order dans une transaction.
 * Met à jour variant.stock_qty.
 * Appelle revalidateTag() sur chaque variante concernée.
 *
 * @param tx       Transaction Drizzle
 * @param orderId  ID de l'order
 * @param sign     -1 (décrémenter) | +1 (recréditer)
 * @param reason   'order' | 'cancellation' | 'return'
 */
async function applyStockDelta(
  tx:      Parameters<Parameters<typeof dbAdmin.transaction>[0]>[0],
  orderId: string,
  sign:    -1 | 1,
  reason:  'order' | 'cancellation' | 'return',
): Promise<void> {
  // Récupérer les items de la commande
  const items = await tx
    .select({ variantId: orderItems.variantId, qty: orderItems.qty })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))

  for (const item of items) {
    const delta = sign * item.qty

    // UPDATE atomique : `stock_qty = stock_qty + delta` côté SQL (pas de
    // read-then-write), verrou de ligne implicite le temps de la transaction.
    // En décrément, le WHERE impose stock_qty >= qty → 0 ligne = solde
    // insuffisant (contrat §C, filet + CHECK stock_qty >= 0).
    const updated = await tx
      .update(variants)
      .set({
        stockQty: sql`${variants.stockQty} + ${delta}`,
        updatedAt: new Date(),
      })
      .where(
        sign === -1
          ? and(
              eq(variants.id, item.variantId),
              gte(variants.stockQty, item.qty),
            )
          : eq(variants.id, item.variantId),
      )
      .returning({ stockQty: variants.stockQty })

    if (updated.length === 0) {
      throw new Error(
        `Stock insuffisant pour la variante ${item.variantId} (demandé: ${item.qty})`,
      )
    }

    await tx.insert(stockLedger).values({
      id:        uuidv4(),
      variantId: item.variantId,
      delta,
      reason,
      orderId,
    })
  }
}

/**
 * revalidateTag pour toutes les variantes d'un order.
 * Appelé APRÈS la transaction (hors tx — effet de bord Next.js cache).
 * Convention de tag : `stock:${variantId}` (à aligner avec 'use cache' dans l'UI).
 */
async function revalidateOrderStock(orderId: string): Promise<void> {
  const items = await dbAdmin
    .select({ variantId: orderItems.variantId })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))

  const variantIds = [...new Set(items.map((i) => i.variantId))]
  for (const variantId of variantIds) {
    revalidateTag(`stock:${variantId}`)
  }
  // Tag global catalogue (pour les pages listing)
  revalidateTag('stock')
}

// ─────────────────────────────────────────────
// Lecture commandes (storefront)
// ─────────────────────────────────────────────

/**
 * Retourne une commande si elle appartient à l'utilisateur connecté.
 * Autorisation explicite via customer_id === session.user.id (pas de RLS).
 */
export async function getOrder(orderId: string) {
  const authResult = await requireSession()
  if (isActionResult(authResult)) return { success: false, error: authResult.error }

  // dbAdmin + filtre propriétaire explicite : la table `order` est
  // deny-by-default pour dbAnon (aucune policy RLS) — cf. supabase/policies.sql.
  const [order] = await dbAdmin
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.customerId, authResult.userId),
      )
    )
    .limit(1)

  if (!order) return { success: false, error: 'Commande introuvable' }
  return { success: true, order }
}

/**
 * Retourne toutes les commandes de l'utilisateur connecté.
 */
export async function getMyOrders() {
  const authResult = await requireSession()
  if (isActionResult(authResult)) return { success: false, error: authResult.error, orders: [] }

  const result = await dbAdmin
    .select()
    .from(orders)
    .where(eq(orders.customerId, authResult.userId))
    .orderBy(orders.createdAt)

  return { success: true, orders: result }
}

// ─────────────────────────────────────────────
// Lecture commandes (admin)
// ─────────────────────────────────────────────

/** Liste toutes les commandes (admin). */
export async function adminListOrders(status?: OrderStatus) {
  const authResult = await requireAdmin()
  if (isActionResult(authResult)) return { success: false, error: authResult.error, orders: [] }

  const result = await dbAdmin
    .select()
    .from(orders)
    .where(status ? eq(orders.status, status) : undefined)
    .orderBy(orders.createdAt)

  return { success: true, orders: result }
}

// ─────────────────────────────────────────────
// Transitions — Admin uniquement
// ─────────────────────────────────────────────

/**
 * pending_whatsapp → confirmed
 * Aucun impact stock.
 */
export async function confirmOrder(orderId: string): Promise<ActionResult> {
  const authResult = await requireAdmin()
  if (isActionResult(authResult)) return authResult

  const [order] = await dbAdmin
    .select({ status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1)

  if (!order) return { success: false, error: 'Commande introuvable' }
  if (order.status !== 'pending_whatsapp') {
    return { success: false, error: `Transition invalide : ${order.status} → confirmed` }
  }

  await dbAdmin
    .update(orders)
    .set({ status: 'confirmed' })
    .where(eq(orders.id, orderId))

  return { success: true }
}

/**
 * confirmed → processing
 * Décrémente StockLedger (reason='order') + revalidateTag().
 * Vérification solde ≥ 0 avant décrémentation.
 */
export async function processOrder(orderId: string): Promise<ActionResult> {
  const authResult = await requireAdmin()
  if (isActionResult(authResult)) return authResult

  const [order] = await dbAdmin
    .select({ status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1)

  if (!order) return { success: false, error: 'Commande introuvable' }
  if (order.status !== 'confirmed') {
    return { success: false, error: `Transition invalide : ${order.status} → processing` }
  }

  try {
    await dbAdmin.transaction(async (tx) => {
      // Décrémente stock (seul endroit où c'est autorisé)
      await applyStockDelta(tx, orderId, -1, 'order')

      // Mise à jour statut
      await tx
        .update(orders)
        .set({ status: 'processing' })
        .where(eq(orders.id, orderId))
    })
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erreur lors du traitement',
    }
  }

  // revalidateTag() — hors transaction, après commit
  await revalidateOrderStock(orderId)

  return { success: true }
}

/**
 * processing → shipped
 * Aucun impact stock.
 */
export async function shipOrder(orderId: string): Promise<ActionResult> {
  const authResult = await requireAdmin()
  if (isActionResult(authResult)) return authResult

  const [order] = await dbAdmin
    .select({ status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1)

  if (!order) return { success: false, error: 'Commande introuvable' }
  if (order.status !== 'processing') {
    return { success: false, error: `Transition invalide : ${order.status} → shipped` }
  }

  await dbAdmin
    .update(orders)
    .set({ status: 'shipped' })
    .where(eq(orders.id, orderId))

  return { success: true }
}

/**
 * shipped → delivered
 * Validation manuelle admin — aucun impact stock.
 */
export async function deliverOrder(orderId: string): Promise<ActionResult> {
  const authResult = await requireAdmin()
  if (isActionResult(authResult)) return authResult

  const [order] = await dbAdmin
    .select({ status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1)

  if (!order) return { success: false, error: 'Commande introuvable' }
  if (order.status !== 'shipped') {
    return { success: false, error: `Transition invalide : ${order.status} → delivered` }
  }

  await dbAdmin
    .update(orders)
    .set({ status: 'delivered' })
    .where(eq(orders.id, orderId))

  return { success: true }
}

/**
 * confirmed → cancelled
 * Aucun stock à recréditer (jamais décrémenté à ce stade).
 * Arbitrage regles-coordination §9 : transition valide.
 */
export async function cancelConfirmedOrder(orderId: string): Promise<ActionResult> {
  const authResult = await requireAdmin()
  if (isActionResult(authResult)) return authResult

  const [order] = await dbAdmin
    .select({ status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1)

  if (!order) return { success: false, error: 'Commande introuvable' }
  if (order.status !== 'confirmed') {
    return { success: false, error: `Transition invalide : ${order.status} → cancelled` }
  }

  await dbAdmin
    .update(orders)
    .set({ status: 'cancelled' })
    .where(eq(orders.id, orderId))

  // Pas de StockLedger — aucune décrémentation n'a eu lieu à ce stade
  return { success: true }
}

/**
 * processing → cancelled
 * Recrédite StockLedger (reason='cancellation') + revalidateTag().
 */
export async function cancelProcessingOrder(orderId: string): Promise<ActionResult> {
  const authResult = await requireAdmin()
  if (isActionResult(authResult)) return authResult

  const [order] = await dbAdmin
    .select({ status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1)

  if (!order) return { success: false, error: 'Commande introuvable' }
  if (order.status !== 'processing') {
    return { success: false, error: `Transition invalide : ${order.status} → cancelled` }
  }

  try {
    await dbAdmin.transaction(async (tx) => {
      // Recrédite stock
      await applyStockDelta(tx, orderId, +1, 'cancellation')

      await tx
        .update(orders)
        .set({ status: 'cancelled' })
        .where(eq(orders.id, orderId))
    })
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erreur lors de l\'annulation',
    }
  }

  await revalidateOrderStock(orderId)
  return { success: true }
}

/**
 * shipped → cancelled (retour)
 * Recrédite StockLedger (reason='return') + revalidateTag().
 */
export async function returnShippedOrder(orderId: string): Promise<ActionResult> {
  const authResult = await requireAdmin()
  if (isActionResult(authResult)) return authResult

  const [order] = await dbAdmin
    .select({ status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1)

  if (!order) return { success: false, error: 'Commande introuvable' }
  if (order.status !== 'shipped') {
    return { success: false, error: `Transition invalide : ${order.status} → cancelled` }
  }

  try {
    await dbAdmin.transaction(async (tx) => {
      // Recrédite stock (retour)
      await applyStockDelta(tx, orderId, +1, 'return')

      await tx
        .update(orders)
        .set({ status: 'cancelled' })
        .where(eq(orders.id, orderId))
    })
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erreur lors du retour',
    }
  }

  await revalidateOrderStock(orderId)
  return { success: true }
}

// ─────────────────────────────────────────────
// Dispatcher générique (facultatif — usage Admin UI)
// ─────────────────────────────────────────────

/**
 * Dispatcher unique pour le dashboard Admin.
 * Valide la transition avant de router vers la bonne action.
 */
export async function transitionOrder(
  orderId: string,
  targetStatus: OrderStatus,
): Promise<ActionResult> {
  const [order] = await dbAdmin
    .select({ status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1)

  if (!order) return { success: false, error: 'Commande introuvable' }

  const from = order.status as OrderStatus

  // Matrice des transitions autorisées
  const transitions: TransitionMatrix = {
    pending_whatsapp: {
      confirmed:  () => confirmOrder(orderId),
    },
    confirmed: {
      processing: () => processOrder(orderId),
      cancelled:  () => cancelConfirmedOrder(orderId),
    },
    processing: {
      shipped:    () => shipOrder(orderId),
      cancelled:  () => cancelProcessingOrder(orderId),
    },
    shipped: {
      delivered:  () => deliverOrder(orderId),
      cancelled:  () => returnShippedOrder(orderId),
    },
  }

  const handler = transitions[from]?.[targetStatus]
  if (!handler) {
    return {
      success: false,
      error: `Transition non autorisée : ${from} → ${targetStatus}`,
    }
  }

  return handler()
}