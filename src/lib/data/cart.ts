import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import { cookies } from 'next/headers'
import { Redis } from '@upstash/redis'
import type { Cart } from '@/lib/actions/cart'

/**
 * Lecture cachée du compteur panier, pour le badge (navbar + bottom-nav).
 * Tag `cart` — busté par toute mutation de `src/lib/actions/cart.ts`
 * (`saveCart` / `clearCart` appellent `updateTag('cart')`).
 *
 * Client Redis dédié (le module `actions/cart.ts` est `'use server'` : ses
 * consts ne sont pas ré-exportables). Même clé `cart:<sessionId>`.
 */
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

async function cartItemCount(sessionId: string): Promise<number> {
  'use cache'
  cacheLife('minutes')
  cacheTag('cart')

  try {
    const cart = await redis.get<Cart>(`cart:${sessionId}`)
    return (cart?.items ?? []).reduce((n, i) => n + i.qty, 0)
  } catch (err) {
    console.error('[data/cart] cartItemCount', err)
    return 0
  }
}

/** Nombre d'articles (somme des quantités) du panier de la session courante. */
export async function getCartBadgeCount(): Promise<number> {
  const sessionId = (await cookies()).get('cart-session')?.value
  return sessionId ? cartItemCount(sessionId) : 0
}
