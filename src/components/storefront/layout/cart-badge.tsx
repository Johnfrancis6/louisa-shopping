// src/components/storefront/layout/cart-badge.tsx
import { getCartBadgeCount } from '@/lib/data/cart'

/**
 * Pastille compteur panier. Lecture cachée (tag `cart`, bustée par les
 * mutations panier → le badge se met à jour dès la fin de l'action).
 * Composant dynamique (lit le cookie de session) : toujours sous <Suspense>.
 */
export async function CartBadge() {
  const count = await getCartBadgeCount()

  if (count === 0) return null

  return (
    <span
      key={count}
      className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-ls-danger px-1 text-[10px] font-medium leading-none text-white animate-in zoom-in-50 duration-[var(--duration-ls-bounce)] ease-[var(--ease-ls-out)]"
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
