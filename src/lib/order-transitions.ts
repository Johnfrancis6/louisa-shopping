/**
 * src/lib/order-transitions.ts
 * Diagramme d'états des commandes — SOURCE UNIQUE.
 * Utilisé par la Server Action de transition (orders.ts) ET par la façade
 * Admin (admin/orders.ts) pour désactiver les boutons impossibles.
 *
 * Flux simplifié (2026-09) — l'admin ne touche la commande qu'à deux moments :
 *   pending_whatsapp → confirmed   (valide la commande reçue sur WhatsApp)
 *   confirmed        → delivered   (marque livrée — SEUL moment où le stock bouge)
 * `cancelled` reste accessible tant que le stock n'a pas bougé
 * (depuis pending_whatsapp ou confirmed). `processing` / `shipped` sont des
 * statuts hérités : plus produits, sans transition sortante.
 */
import type { OrderStatus } from '@/lib/db/schema'

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_whatsapp: ['confirmed', 'cancelled'],
  confirmed: ['delivered', 'cancelled'],
  processing: [], // hérité — flux simplifié
  shipped: [], // hérité — flux simplifié
  delivered: [],
  cancelled: [],
}

export function allowedNextStatuses(from: OrderStatus): OrderStatus[] {
  return ORDER_TRANSITIONS[from] ?? []
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return allowedNextStatuses(from).includes(to)
}
