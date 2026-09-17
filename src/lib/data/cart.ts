import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import { cookies } from 'next/headers'
import { Redis } from '@upstash/redis'
import type { Cart } from '@/lib/actions/cart'
import { withFallback } from './resilient'

/**
 * Lecture cachée du compteur panier, pour le badge (navbar + bottom-nav).
 * Tag `cart` — busté par toute mutation de `src/lib/actions/cart.ts`
 * (`saveCart` / `clearCart` appellent `revalidateTag('cart')`).
 *
 * Client Redis dédié (le module `actions/cart.ts` est `'use server'` : ses
 * consts ne sont pas ré-exportables). Même clé `cart:<sessionId>`.
 */
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

async function cartItemCountCached(sessionId: string): Promise<number> {
  'use cache'
  cacheLife('minutes')
  cacheTag('cart')

  const cart = await redis.get<Cart>(`cart:${sessionId}`)
  return (cart?.items ?? []).reduce((n, i) => n + i.qty, 0)
}

/**
 * Nombre d'articles (somme des quantités) du panier de la session courante.
 *
 * Lecture ACCESSOIRE : une panne Redis masque le badge, elle ne coûte pas la
 * page. Le repli est produit hors de la portée cachée — sinon un incident
 * Upstash d'une seconde affichait un panier vide pendant une heure, à des gens
 * qui ont bel et bien des articles dedans.
 */
export async function getCartBadgeCount(): Promise<number> {
  const sessionId = (await cookies()).get('cart-session')?.value
  if (!sessionId) return 0
  return withFallback('cartItemCount', () => cartItemCountCached(sessionId), 0)
}
