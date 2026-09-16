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

import { Redis } from '@upstash/redis'
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
// Client Redis (verrou d'idempotence commande)
// ─────────────────────────────────────────────
// `src/lib/actions/cart.ts` est aussi 'use server' : ses consts ne sont pas
// ré-exportables, on instancie donc un client dédié ici — même pattern que
// src/lib/data/cart.ts (client séparé, même URL/token, pas de state partagé).
const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

/** clientRequestId doit être un UUID — on ne construit jamais une clé Redis à partir d'une chaîne cliente non validée. */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
  /**
   * UUID généré une seule fois au montage de CheckoutFlow (jamais régénéré
   * entre deux clics) — sert de clé de verrou anti double-clic. Voir §4.
   */
  clientRequestId: string
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
 * en base, puis dédoublonnage par variante (3bis), contrôle de stock (3ter),
 * frais de livraison (3quater) et verrou d'idempotence (3quinquies).
 * 4. Transaction Order + OrderItems.  5. Vide le panier.  6. Lien wa.me.
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
  if (!UUID_REGEX.test(input.clientRequestId ?? '')) {
    return { success: false, error: 'Requête invalide' }
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
      stockQty:      variants.stockQty,
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
  const rawItems = lines as NonNullable<(typeof lines)[number]>[]

  // ── 3bis. Dédoublonnage par variante ──────────────────────────────────────
  // `stock_ledger` porte un index unique partiel sur (order_id, variant_id,
  // reason) — stock_ledger_order_variant_reason_uniq, voir src/lib/db/schema.ts.
  // Si le panier contient deux fois la même variante (deux lignes distinctes
  // pour une raison quelconque), insérer deux order_item produirait deux
  // mouvements de stock identiques à la livraison, violerait cet index et
  // rendrait la commande définitivement non livrable. On regroupe donc par
  // variantId, quantités sommées, avant tout calcul et avant l'insert — le
  // itemsSnapshot et les order_item ci-dessous partagent ce même tableau dédupliqué.
  const itemsByVariant = new Map<string, (typeof rawItems)[number]>()
  for (const l of rawItems) {
    const existing = itemsByVariant.get(l.variantId)
    if (existing) {
      existing.qty += l.qty
    } else {
      itemsByVariant.set(l.variantId, { ...l })
    }
  }
  const items = [...itemsByVariant.values()]

  // ── 3ter. Vérification du stock (aucune réservation) ───────────────────────
  // La commande n'est qu'une pré-réservation : le stock ne bouge qu'au passage
  // confirmed→delivered (cf. en-tête de fichier), jamais ici. Mais une commande
  // dont la quantité dépasse le stock courant devient DÉFINITIVEMENT non
  // livrable : deliverOrder (src/lib/actions/orders.ts, applyStockDelta) lève
  // « Stock insuffisant », sa transaction est annulée, et la commande reste
  // coincée en `confirmed` sans autre issue que l'annulation (pas de retour à
  // `pending_whatsapp`, pas de nouvelle tentative de livraison possible). On
  // refuse donc ici plutôt que de laisser ce cul-de-sac se former à la livraison.
  // Ce contrôle ne ferme qu'une fenêtre de course, il ne l'élimine pas :
  // addToCart (src/lib/actions/cart.ts) refuse déjà tout dépassement au moment
  // de l'ajout au panier, mais deux clients peuvent commander la même variante
  // au même instant sans se voir l'un l'autre. Et à la différence de la zone
  // de livraison inconnue (qui, elle, ne bloque JAMAIS la commande — cf. § en
  // tête de fichier), ce refus n'arbitre pas à la place du commerçant : il
  // évite seulement une impasse technique, pas un choix commercial.
  for (const l of items) {
    const stockQty = byId.get(l.variantId)?.stockQty ?? 0
    if (l.qty > stockQty) {
      return {
        success: false,
        error: `${l.productName} — Stock disponible : ${stockQty} unité(s)`,
      }
    }
  }

  const sousTotal = items.reduce((sum, l) => sum + l.unitPrice * l.qty, 0)

  // ── 3quater. Frais de livraison — résolu côté serveur, jamais transmis par le client ─
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

  // ── 3quinquies. Idempotence — verrou anti double-clic ──────────────────────
  // Un double-clic (ou un retry réseau) sur « Valider ma commande » ne doit
  // pas créer deux Order. clientRequestId est généré une seule fois au montage
  // de CheckoutFlow : deux appels successifs avec le même id sont donc bien le
  // même clic logique. On pose un verrou Redis SET NX juste avant la
  // transaction ; s'il existe déjà, un appel précédent a gagné la course et on
  // renvoie SON orderId plutôt que d'en créer un second.
  const orderId = crypto.randomUUID()
  const lockKey = `order-lock:${input.clientRequestId}`
  let lockOwnedByUs = false
  try {
    const acquired = await redis.set(lockKey, orderId, { nx: true, ex: 120 })
    if (acquired === null) {
      // Clé déjà posée par l'appel précédent — on renvoie SA commande.
      const existingOrderId = await redis.get<string>(lockKey)
      if (existingOrderId) {
        return { success: true, orderId: existingOrderId }
      }
      // GET revenu vide : course très étroite avec l'expiration du verrou
      // (TTL 120s). On retombe sur une création normale plutôt que de bloquer
      // la vente pour un cas aussi marginal.
    } else {
      lockOwnedByUs = true
    }
  } catch (err) {
    // Panne Redis : le verrou ne doit JAMAIS bloquer une vente — on perd
    // seulement la protection anti double-clic pour cet appel-ci.
    console.error('[checkout] order-lock Redis indisponible — poursuite sans verrou', err)
  }

  // ── 4. Transaction Order + OrderItems ─────────
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
    if (lockOwnedByUs) {
      // La commande n'a finalement pas été créée : on libère le verrou pour
      // qu'un retry avec le même clientRequestId puisse retenter normalement
      // au lieu de rester bloqué sur un orderId inexistant.
      try {
        await redis.del(lockKey)
      } catch (delErr) {
        console.error('[checkout] order-lock libération échouée', delErr)
      }
    }
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
