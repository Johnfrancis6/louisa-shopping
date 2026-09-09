// src/components/storefront/layout/cart-badge.tsx
import { peekCart } from '@/lib/actions/cart'

/**
 * Pastille compteur panier. Lit le panier Redis en lecture seule (peekCart —
 * jamais de cookie créé ici). Composant dynamique : toujours sous <Suspense>
 * (cacheComponents actif). Le compte fait foi côté serveur uniquement.
 */
export async function CartBadge() {
  const cart = await peekCart()
  const count = cart.items.reduce((n, i) => n + i.qty, 0)

  if (count === 0) return null

  return (
    <span
      className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-ls-danger px-1 text-[10px] font-medium leading-none text-white"
      aria-label={`${count} article${count > 1 ? 's' : ''} dans le panier`}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

export function CartBadgeSkeleton() {
  return (
    <span
      className="ls-skeleton absolute -right-1 -top-1 h-4 w-4 rounded-full"
      aria-hidden="true"
    />
  )
}
