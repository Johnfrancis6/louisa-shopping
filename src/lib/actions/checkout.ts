/**
 * src/lib/actions/checkout.ts
 * Agent : Logique métier
 * Rôle  : Tunnel vitrine — crée l'Order en statut `pending_whatsapp`,
 *         génère le lien wa.me avec message pré-rempli incluant /commandes/[id].
 *
 * Contraintes non-négociables :
 *  - Stock NON décrémenté ici (uniquement à confirmed→delivered).
 *  - payment_method = champ vitrine uniquement, aucune intégration paiement.
 *  - Prix et libellés TOUJOURS relus en base au moment de la commande — le
 *    panier Redis (influençable côté client) ne fait jamais foi sur le prix.
 *  - Écritures via dbAdmin (RLS bypass requis sur Order/OrderItem).
 *  - Frais de livraison : une commande porte un seul frais, déterminé par la
 *    zone choisie par le client. Il vaut le plus élevé des frais annoncés par
 *    les produits du panier pour cette zone — on ne sous-facture jamais une
 *    commande multi-produits. Si aucun produit du panier ne couvre la zone,
 *    on retombe sur `zone.fraisBase`.
 *    La zone est une INDICATION, jamais une condition de validité : la vente
 *    se conclut sur WhatsApp, et c'est au commerçant d'accepter ou de refuser
 *    une destination qu'il ne dessert pas. Une zone inconnue ou absente laisse
 *    donc passer la commande avec un frais à 0, à convenir de vive voix.
 */

'use server'

import { dbAdmin, dbAnon } from '@/lib/db/client'
import { orders, orderItems, variants, products, customer } from '@/lib/db/schema'
import { and, eq, inArray } from 'drizzle-orm'
import { buildWhatsappUrl } from '@/lib/whatsapp'
import { getSession, getUserId } from '@/lib/auth-guards'
import { readSnapshot } from '@/lib/orders-display'
import { getZones } from '@/lib/data/zones'
import type { DeliveryZone } from '@/types/catalog'
import { getCart, clearCart } from './cart'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

/**
 * Adresse de livraison saisie à l'étape « adresse » du tunnel. Figée sur la
 * commande (`order.deliveryAddress`) et recopiée sur `customer.addressJson`
 * pour pré-remplir la fois suivante.
 */
export interface DeliveryAddress {
  fullName:    string
  phone:       string
  /** Quartier / ville — pas de découpage plus fin (modèle BF, livraison vendeur) */
  city:        string
  /** Indications complémentaires (repères, étage…) — optionnel */
  directions?: string
}

export interface CheckoutInput {
  address:       DeliveryAddress
  /** Intention de paiement — affichage vitrine uniquement */
  paymentMethod: 'mobile_money_orange' | 'mobile_money_moov' | 'cod'
  /** Zone de livraison choisie — le frais est résolu côté serveur, jamais transmis par le client */
  zoneId:        string
}

const PHONE_REGEX = /^\+?[0-9\s-]{8,20}$/

/** Normalise l'adresse issue du client (trim, drop directions vide). */
function cleanAddress(a: DeliveryAddress | undefined): DeliveryAddress | null {
  if (!a) return null
  const fullName = a.fullName?.trim() ?? ''
  const phone = a.phone?.trim() ?? ''
  const city = a.city?.trim() ?? ''
  const directions = a.directions?.trim() ?? ''
  if (!fullName || !city || !PHONE_REGEX.test(phone)) return null
  return directions ? { fullName, phone, city, directions } : { fullName, phone, city }
}

/**
 * Adresse de livraison pré-remplie pour l'étape « adresse » du tunnel :
 * `customer.addressJson` si déjà renseignée, sinon nom + téléphone de session.
 * Toujours partiel — l'appelant garde déjà la session (page /commander).
 */
export async function getMyDeliveryAddress(): Promise<Partial<DeliveryAddress>> {
  const session = await getSession()
  if (!session?.user?.id) return {}

  const fallback: Partial<DeliveryAddress> = {
    fullName: session.user.name ?? '',
    phone: (session.user as { phone?: string }).phone ?? '',
  }

  try {
    const [row] = await dbAdmin
      .select({ addressJson: customer.addressJson })
      .from(customer)
      .where(eq(customer.id, session.user.id))
      .limit(1)

    const saved = (row?.addressJson ?? null) as Partial<DeliveryAddress> | null
    if (saved && typeof saved === 'object') {
      return {
        fullName: saved.fullName || fallback.fullName,
        phone: saved.phone || fallback.phone,
        city: saved.city ?? '',
        directions: saved.directions ?? '',
      }
    }
  } catch (err) {
    console.error('[checkout] getMyDeliveryAddress', err)
  }
  return fallback
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

  const address = cleanAddress(input?.address)
  if (!address) {
    return { success: false, error: 'Adresse de livraison incomplète — nom, téléphone et quartier/ville requis' }
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
      deliveryZones: products.deliveryZones,
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
  const sousTotal = items.reduce((sum, l) => sum + l.unitPrice * l.qty, 0)

  // ── 3bis. Frais de livraison — résolu côté serveur, jamais transmis par le client ─
  // Zone inconnue ou absente : on NE refuse PAS la commande (cf. règle en tête
  // de fichier). Frais à 0, libellé null — le vendeur tranchera sur WhatsApp.
  const zones = await getZones()
  const zoneChoisie = zones.find((z) => z.id === input.zoneId) ?? null

  // Le jsonb `deliveryZones` est saisi librement en admin, jamais validé : on
  // ne retient une entrée que si elle est structurellement valide (frais entier).
  const fraisAnnonces = zoneChoisie
    ? cart.items
        .map((cartItem) => byId.get(cartItem.variantId)?.deliveryZones)
        .flatMap((dz) => (Array.isArray(dz) ? (dz as DeliveryZone[]) : []))
        .filter(
          (entry) =>
            entry?.zone_id === zoneChoisie.id &&
            typeof entry.frais === 'number' &&
            Number.isInteger(entry.frais),
        )
        .map((entry) => entry.frais)
    : []

  const fraisLivraison =
    fraisAnnonces.length > 0 ? Math.max(...fraisAnnonces) : zoneChoisie?.fraisBase ?? 0
  const total = sousTotal + fraisLivraison

  // ── 4. Transaction Order + OrderItems ─────────
  const orderId = crypto.randomUUID()
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
        deliveryAddress: address,
        deliveryFee: fraisLivraison,
        deliveryZoneLabel: zoneChoisie?.nom ?? null,
        whatsappRef: null,
      })

      await tx.insert(orderItems).values(
        items.map((l) => ({
          id:        crypto.randomUUID(),
          orderId,
          variantId: l.variantId,
          qty:       l.qty,
          unitPrice: l.unitPrice,
        })),
      )

      // Recopie sur le profil pour pré-remplir la prochaine commande.
      await tx
        .update(customer)
        .set({ addressJson: address })
        .where(eq(customer.id, userId))
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
      customerName:  address.fullName,
      deliveryAddress: address,
      paymentMethod: input.paymentMethod,
      total,
      deliveryFee: fraisLivraison,
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

/**
 * Reconstruit le lien wa.me de confirmation pour une commande donnée
 * (page /commandes/[id]). Vérifie la propriété. null si config WA manquante.
 */
export async function getOrderWhatsappUrl(orderId: string): Promise<string | null> {
  const userId = await getUserId()
  if (!userId) return null

  try {
    const [row] = await dbAdmin
      .select({
        id: orders.id,
        customerId: orders.customerId,
        total: orders.total,
        paymentMethod: orders.paymentMethod,
        itemsSnapshot: orders.itemsSnapshot,
        deliveryAddress: orders.deliveryAddress,
        deliveryFee: orders.deliveryFee,
        customerName: customer.name,
      })
      .from(orders)
      .innerJoin(customer, eq(orders.customerId, customer.id))
      .where(and(eq(orders.id, orderId), eq(orders.customerId, userId)))
      .limit(1)

    if (!row) return null

    const address = cleanAddress(row.deliveryAddress as DeliveryAddress | undefined)

    return await buildWhatsappUrl({
      orderId: row.id,
      orderUrl: `${BASE_URL}/commandes/${row.id}`,
      customerName: address?.fullName ?? row.customerName,
      deliveryAddress: address ?? undefined,
      paymentMethod: row.paymentMethod as CheckoutInput['paymentMethod'],
      total: row.total,
      deliveryFee: row.deliveryFee,
      items: readSnapshot(row.itemsSnapshot).map((it) => ({
        productName: it.product_name,
        sku: it.sku,
        size: it.size,
        color: it.color,
        qty: it.qty,
        unitPrice: it.unit_price_at_order,
      })),
    })
  } catch (err) {
    console.error('[checkout] getOrderWhatsappUrl', err)
    return null
  }
}
