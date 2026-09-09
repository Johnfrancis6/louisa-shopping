/**
 * src/lib/orders-display.ts
 * Libellés / helpers d'affichage des commandes, partagés storefront + admin.
 */
import type { OrderStatus } from '@/lib/db/schema'

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_whatsapp: 'En attente de confirmation',
  confirmed: 'Confirmée',
  processing: 'En préparation',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  mobile_money_orange: 'Orange Money',
  mobile_money_moov: 'Moov Money',
  cod: 'Paiement à la livraison',
}

/** Structure figée d'un item dans order.itemsSnapshot (cf. checkout.ts). */
export interface OrderSnapshotItem {
  variant_id: string
  sku: string
  product_name: string
  size: string | null
  color: string | null
  unit_price_at_order: number
  qty: number
  has_tutorial: boolean
}

export function readSnapshot(value: unknown): OrderSnapshotItem[] {
  return Array.isArray(value) ? (value as OrderSnapshotItem[]) : []
}
