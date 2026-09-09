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

/** Adresse de livraison figée sur `order.deliveryAddress` (cf. checkout.ts). */
export interface OrderDeliveryAddress {
  fullName: string
  phone: string
  city: string
  directions?: string
}

export function readDeliveryAddress(value: unknown): OrderDeliveryAddress | null {
  if (!value || typeof value !== 'object') return null
  const a = value as Record<string, unknown>
  const fullName = typeof a.fullName === 'string' ? a.fullName : ''
  const phone = typeof a.phone === 'string' ? a.phone : ''
  const city = typeof a.city === 'string' ? a.city : ''
  if (!fullName && !city && !phone) return null
  const directions = typeof a.directions === 'string' && a.directions ? a.directions : undefined
  return { fullName, phone, city, ...(directions ? { directions } : {}) }
}
