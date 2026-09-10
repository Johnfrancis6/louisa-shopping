/**
 * src/lib/actions/cart.ts
 * Agent : Logique métier
 * Rôle  : Gestion du panier persisté en session Redis Upstash (TTL 7j).
 *         Aucune décrémentation de stock ici — uniquement au confirmed→processing.
 *         Pas de logique de paiement réel.
 */

'use server'

import { Redis } from '@upstash/redis'
import { cookies } from 'next/headers'
import { revalidateTag } from 'next/cache'
import { dbAnon } from '@/lib/db/client'
import { variants, products, media } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

// ─────────────────────────────────────────────
// Client Redis
// ─────────────────────────────────────────────

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const CART_TTL = 60 * 60 * 24 * 7 // 7 jours
const CART_COOKIE = 'cart-session'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface CartItem {
  variantId:   string
  productId:   string
  productName: string
  slug:        string   // pour les liens fiche produit
  sku:         string
  size?:       string | null
  color?:      string | null
  unitPrice:   number   // FCFA, entier (price_override ?? base_price) — TOUJOURS serveur
  imageUrl?:   string | null
  hasTutorial: boolean
  stockQty:    number   // stock courant relu au dernier add/update (cap quantité UI)
  qty:         number
}

export interface Cart {
  sessionId: string
  items:     CartItem[]
  updatedAt: string
}

// ─────────────────────────────────────────────
// Helpers session
// ─────────────────────────────────────────────

function cartKey(sessionId: string) {
  return `cart:${sessionId}`
}

async function getOrCreateSessionId(): Promise<string> {
  const cookieStore = await cookies()
  let sessionId = cookieStore.get(CART_COOKIE)?.value

  if (!sessionId) {
    sessionId = crypto.randomUUID()
    cookieStore.set(CART_COOKIE, sessionId, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   CART_TTL,
      path:     '/',
    })
  }
  return sessionId
}

/** Lecture seule : ne crée jamais de cookie (utilisable en Server Component). */
async function peekSessionId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(CART_COOKIE)?.value ?? null
}

const emptyCart = (sessionId: string): Cart => ({
  sessionId,
  items: [],
  updatedAt: new Date().toISOString(),
})

async function loadCart(sessionId: string): Promise<Cart> {
  try {
    const raw = await redis.get<Cart>(cartKey(sessionId))
    return raw ?? emptyCart(sessionId)
  } catch (err) {
    console.error('[cart] loadCart', err)
    return emptyCart(sessionId)
  }
}

async function saveCart(cart: Cart): Promise<void> {
  cart.updatedAt = new Date().toISOString()
  await redis.set(cartKey(cart.sessionId), cart, { ex: CART_TTL })
  // Invalide le compteur du badge panier (src/lib/data/cart.ts, tag 'cart').
  revalidateTag('cart')
}

// ─────────────────────────────────────────────
// Server Actions publiques
// ─────────────────────────────────────────────

/**
 * Panier courant. ⚠️ Peut créer le cookie de session — à n'appeler que depuis
 * une Server Action / Route Handler, JAMAIS un Server Component.
 */
export async function getCart(): Promise<Cart> {
  const sessionId = await getOrCreateSessionId()
  return loadCart(sessionId)
}

/**
 * Panier courant en lecture seule (aucune écriture de cookie) — pour les
 * Server Components (page /panier, badge panier). Panier vide si pas de cookie.
 */
export async function peekCart(): Promise<Cart> {
  const sessionId = await peekSessionId()
  return sessionId ? loadCart(sessionId) : emptyCart('')
}

/**
 * Résout une variante en données panier AUTORITAIRES (serveur).
 * Le client ne fournit jamais que `variantId` + `qty` : prix, libellés, image
 * et flag tutoriel sont TOUJOURS relus en base (anti-falsification de prix).
 */
async function resolveCartItem(variantId: string): Promise<Omit<CartItem, 'qty'> | null> {
  try {
    const [row] = await dbAnon
      .select({
        variantId:     variants.id,
        productId:     products.id,
        productName:   products.name,
        slug:          products.slug,
        sku:           variants.sku,
        size:          variants.size,
        color:         variants.color,
        stockQty:      variants.stockQty,
        priceOverride: variants.priceOverride,
        basePrice:     products.basePrice,
        hasTutorial:   products.hasTutorial,
      })
      .from(variants)
      .innerJoin(products, eq(variants.productId, products.id))
      .where(and(eq(variants.id, variantId), eq(products.isActive, true)))
      .limit(1)

    if (!row) return null

    const [image] = await dbAnon
      .select({ url: media.url })
      .from(media)
      .where(and(eq(media.productId, row.productId), eq(media.type, 'image')))
      .orderBy(media.position)
      .limit(1)

    return {
      variantId:   row.variantId,
      productId:   row.productId,
      productName: row.productName,
      slug:        row.slug,
      sku:         row.sku,
      size:        row.size,
      color:       row.color,
      unitPrice:   row.priceOverride ?? row.basePrice, // prix serveur, jamais le client
      imageUrl:    image?.url ?? null,
      hasTutorial: row.hasTutorial,
      stockQty:    row.stockQty,
    }
  } catch (err) {
    console.error('[cart] resolveCartItem', err)
    return null
  }
}

/**
 * Ajoute (ou incrémente) une variante au panier. Signature volontairement
 * minimale : le serveur reconstruit toute la ligne depuis la base.
 */
export async function addToCart(
  variantId: string,
  qty: number = 1,
): Promise<{ success: boolean; error?: string; cart?: Cart }> {
  if (!Number.isInteger(qty) || qty < 1) {
    return { success: false, error: 'Quantité invalide' }
  }

  const resolved = await resolveCartItem(variantId)
  if (!resolved) return { success: false, error: 'Article indisponible' }
  if (resolved.stockQty <= 0) return { success: false, error: 'Rupture de stock' }

  const sessionId = await getOrCreateSessionId()
  const cart      = await loadCart(sessionId)

  const existing = cart.items.find((i) => i.variantId === variantId)
  const targetQty = (existing?.qty ?? 0) + qty

  if (targetQty > resolved.stockQty) {
    return { success: false, error: `Stock disponible : ${resolved.stockQty} unité(s)` }
  }

  if (existing) {
    // Rafraîchit prix / libellés / stock au passage.
    Object.assign(existing, resolved, { qty: targetQty })
  } else {
    cart.items.push({ ...resolved, qty: targetQty })
  }

  await saveCart(cart)
  return { success: true, cart }
}

/** Met à jour la quantité d'un article (0 ou moins = suppression). */
export async function updateCartItem(
  variantId: string,
  qty: number,
): Promise<{ success: boolean; error?: string; cart?: Cart }> {
  const sessionId = await getOrCreateSessionId()
  const cart      = await loadCart(sessionId)

  if (!Number.isInteger(qty) || qty <= 0) {
    cart.items = cart.items.filter((i) => i.variantId !== variantId)
    await saveCart(cart)
    return { success: true, cart }
  }

  const existing = cart.items.find((i) => i.variantId === variantId)
  if (!existing) return { success: false, error: 'Article absent du panier' }

  const resolved = await resolveCartItem(variantId)
  if (!resolved) {
    // Article devenu indisponible : on le retire plutôt que de bloquer.
    cart.items = cart.items.filter((i) => i.variantId !== variantId)
    await saveCart(cart)
    return { success: false, error: 'Cet article n\'est plus disponible', cart }
  }
  if (qty > resolved.stockQty) {
    return { success: false, error: `Stock disponible : ${resolved.stockQty} unité(s)` }
  }

  Object.assign(existing, resolved, { qty })
  await saveCart(cart)
  return { success: true, cart }
}

/** Supprime un article du panier. */
export async function removeFromCart(
  variantId: string,
): Promise<{ success: boolean; cart?: Cart }> {
  const sessionId = await getOrCreateSessionId()
  const cart      = await loadCart(sessionId)
  cart.items      = cart.items.filter((i) => i.variantId !== variantId)
  await saveCart(cart)
  return { success: true, cart }
}

/** Vide intégralement le panier (appelé après createOrder). */
export async function clearCart(): Promise<void> {
  const sessionId = await getOrCreateSessionId()
  await redis.del(cartKey(sessionId))
  revalidateTag('cart')
}

/** Total panier en FCFA. */
export async function computeCartTotal(cart: Cart): Promise<number> {
  return cart.items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0)
}