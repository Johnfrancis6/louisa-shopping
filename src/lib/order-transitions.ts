/**
 * src/lib/order-transitions.ts
 * Diagramme d'états des commandes — SOURCE UNIQUE (contrat v2.5 §F).
 * Utilisé par la Server Action de transition (orders.ts) ET par la façade
 * Admin (admin/orders.ts) pour désactiver les boutons impossibles.
 */
import type { OrderStatus } from '@/lib/db/schema'

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_whatsapp: ['confirmed'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
}

export function allowedNextStatuses(from: OrderStatus): OrderStatus[] {
  return ORDER_TRANSITIONS[from] ?? []
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return allowedNextStatuses(from).includes(to)
}
