/**
 * src/lib/actions/orders.ts
 * Agent : Logique métier
 * Rôle  : Toutes les transitions Order.status, mutations StockLedger, revalidateTag().
 *
 * Diagramme d'états (flux simplifié 2026-09) :
 *   pending_whatsapp → confirmed       (admin — valide la commande WhatsApp)
 *   pending_whatsapp → cancelled       (admin — aucun stock à toucher)
 *   confirmed        → delivered       (admin — décrémente StockLedger reason='order')
 *   confirmed        → cancelled       (admin — aucun stock à recréditer, jamais décrémenté)
 *
 * Règles strictes :
 *  - StockLedger décrémenté UNIQUEMENT à confirmed→delivered.
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
import { canTransition } from '@/lib/order-transitions'
import {
  orders,
  orderItems,
  stockLedger,
  variants,
}                         from '@/lib/db/schema'
import { eq, and, desc, gte, sql } from 'drizzle-orm'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

// OrderStatus importé depuis @/lib/db/client (ré-export schema.ts)

export interface ActionResult {
  success: boolean
  error?:  string
}

type TransitionHandler = () => Promise<ActionResult>

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
      id:        crypto.randomUUID(),
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
 * Retourne toutes les commandes de l'utilisateur connecté, plus récente
 * d'abord (même convention que les vues admin — cf. src/lib/db/admin.ts).
 */
export async function getMyOrders() {
  const authResult = await requireSession()
  if (isActionResult(authResult)) return { success: false, error: authResult.error, orders: [] }

  const result = await dbAdmin
    .select()
    .from(orders)
    .where(eq(orders.customerId, authResult.userId))
    .orderBy(desc(orders.createdAt))

  return { success: true, orders: result }
}

// ─────────────────────────────────────────────
// Transitions — Admin uniquement
// ─────────────────────────────────────────────

/** Sentinelle : la garde `WHERE status = from` a rejeté la transition. */
class TransitionRejected extends Error {}

/**
 * Ce qui sait exécuter un UPDATE : `dbAdmin` ou une transaction. On ne retient
 * que `update` — `typeof dbAdmin` exige `$client`, qu'une transaction n'a pas.
 */
type Executor = Pick<typeof dbAdmin, 'update'>

/**
 * Écrit `from → to` SI la commande est TOUJOURS en `from`.
 *
 * La garde vit dans le WHERE, jamais dans un read-then-write : l'UPDATE pose
 * le verrou de ligne et sérialise deux appels concurrents (double-clic admin,
 * retry réseau). Le perdant touche 0 ligne et ressort. Sans ça, `deliverOrder`
 * décrémentait le stock deux fois pour une seule commande.
 *
 * @returns false si 0 ligne — commande absente OU déjà transitionnée.
 */
async function writeTransition(
  db: Executor,
  orderId: string,
  from: OrderStatus,
  to: OrderStatus,
): Promise<boolean> {
  const rows = await db
    .update(orders)
    .set({ status: to, updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.status, from)))
    .returning({ id: orders.id })

  return rows.length > 0
}

/** Message d'erreur précis APRÈS un `writeTransition` refusé (hors chemin critique). */
async function explainRejection(orderId: string, to: OrderStatus): Promise<string> {
  const [row] = await dbAdmin
    .select({ status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1)

  if (!row) return 'Commande introuvable'
  return `Transition invalide : ${row.status} → ${to}`
}

/**
 * pending_whatsapp → confirmed
 * Aucun impact stock (le stock ne bouge qu'à la livraison).
 */
export async function confirmOrder(orderId: string): Promise<ActionResult> {
  const authResult = await requireAdmin()
  if (isActionResult(authResult)) return authResult

  if (!(await writeTransition(dbAdmin, orderId, 'pending_whatsapp', 'confirmed'))) {
    return { success: false, error: await explainRejection(orderId, 'confirmed') }
  }
  return { success: true }
}

/**
 * confirmed → delivered
 * SEUL moment où le stock bouge : décrémente StockLedger (reason='order') +
 * revalidateTag().
 *
 * Ordre imposé : la transition D'ABORD, le stock ENSUITE. C'est l'UPDATE
 * gardé qui exclut un second appel concurrent ; l'inverser rouvrirait la
 * fenêtre de double décrément.
 */
export async function deliverOrder(orderId: string): Promise<ActionResult> {
  const authResult = await requireAdmin()
  if (isActionResult(authResult)) return authResult

  try {
    await dbAdmin.transaction(async (tx) => {
      if (!(await writeTransition(tx, orderId, 'confirmed', 'delivered'))) {
        throw new TransitionRejected()
      }
      await applyStockDelta(tx, orderId, -1, 'order')
    })
  } catch (err) {
    if (err instanceof TransitionRejected) {
      return { success: false, error: await explainRejection(orderId, 'delivered') }
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erreur lors de la livraison',
    }
  }

  // revalidateTag() — hors transaction, après commit
  await revalidateOrderStock(orderId)

  return { success: true }
}

/**
 * pending_whatsapp → cancelled
 * Aucun stock touché (jamais décrémenté à ce stade).
 */
export async function cancelPendingOrder(orderId: string): Promise<ActionResult> {
  const authResult = await requireAdmin()
  if (isActionResult(authResult)) return authResult

  if (!(await writeTransition(dbAdmin, orderId, 'pending_whatsapp', 'cancelled'))) {
    return { success: false, error: await explainRejection(orderId, 'cancelled') }
  }
  return { success: true }
}

/**
 * confirmed → cancelled
 * Aucun stock à recréditer (jamais décrémenté à ce stade).
 */
export async function cancelConfirmedOrder(orderId: string): Promise<ActionResult> {
  const authResult = await requireAdmin()
  if (isActionResult(authResult)) return authResult

  if (!(await writeTransition(dbAdmin, orderId, 'confirmed', 'cancelled'))) {
    return { success: false, error: await explainRejection(orderId, 'cancelled') }
  }
  return { success: true }
}

// ─────────────────────────────────────────────
// Dispatcher générique (facultatif — usage Admin UI)
// ─────────────────────────────────────────────

/**
 * Dispatcher unique pour le dashboard Admin. Les RÈGLES de transition vivent
 * dans lib/order-transitions.ts (source unique) ; ici on ne fait que router
 * vers le handler qui porte les effets (stock, revalidation).
 */
export async function transitionOrder(
  orderId: string,
  targetStatus: OrderStatus,
): Promise<ActionResult> {
  const authResult = await requireAdmin()
  if (isActionResult(authResult)) return authResult

  const [order] = await dbAdmin
    .select({ status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1)

  if (!order) return { success: false, error: 'Commande introuvable' }

  const from = order.status as OrderStatus
  if (!canTransition(from, targetStatus)) {
    return { success: false, error: `Transition non autorisée : ${from} → ${targetStatus}` }
  }

  const handlers: Record<string, TransitionHandler> = {
    'pending_whatsapp->confirmed': () => confirmOrder(orderId),
    'pending_whatsapp->cancelled': () => cancelPendingOrder(orderId),
    'confirmed->delivered': () => deliverOrder(orderId),
    'confirmed->cancelled': () => cancelConfirmedOrder(orderId),
  }

  const handler = handlers[`${from}->${targetStatus}`]
  if (!handler) {
    return { success: false, error: `Transition non gérée : ${from} → ${targetStatus}` }
  }
  return handler()
}