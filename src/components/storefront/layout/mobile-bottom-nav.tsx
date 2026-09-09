// src/components/storefront/mobile-bottom-nav.tsx
'use client'

import { Suspense, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House, MagnifyingGlass, ShoppingBag, User } from '@phosphor-icons/react/dist/ssr'

const ITEMS = [
  { href: '/', label: 'Accueil', Icon: House },
  { href: '/recherche', label: 'Recherche', Icon: MagnifyingGlass },
  { href: '/panier', label: 'Panier', Icon: ShoppingBag },
  { href: '/compte', label: 'Compte', Icon: User },
] as const

/** Sous-composant isolé — usePathname() ici, wrappé dans Suspense par le parent */
function NavItems({ cartBadge }: { cartBadge?: ReactNode | null }) {
  const pathname = usePathname()

  return (
    <ul className="flex items-center justify-around">
      {ITEMS.map(({ href, label, Icon }) => {
        const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)

        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className="flex min-h-11 min-w-11 flex-col items-center gap-1 px-3 py-1"
            >
              <span
                className={
                  'relative flex h-9 w-9 items-center justify-center rounded-full transition-[transform,background-color] duration-[--duration-ls-base] ease-[--ease-ls-out] ' +
                  (isActive
                    ? 'scale-110 bg-ls-accent shadow-[0_0_0_6px_var(--color-ls-accent-light)]'
                    : 'bg-transparent')
                }
              >
                <Icon
                  size={20}
                  weight={isActive ? 'fill' : 'regular'}
                  className={isActive ? 'text-white' : 'text-ls-gray-500'}
                />
                {href === '/panier' && cartBadge}
              </span>
              <span
                className={
                  'text-[11px] leading-none transition-colors ' +
                  (isActive ? 'font-medium text-ls-accent' : 'text-ls-gray-500')
                }
              >
                {label}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/** Fallback statique — aucun item actif, structure identique pour éviter le layout shift */
function NavItemsFallback() {
  return (
    <ul className="flex items-center justify-around">
      {ITEMS.map(({ href, label, Icon }) => (
        <li key={href}>
          <div className="flex min-h-11 min-w-11 flex-col items-center gap-1 px-3 py-1">
            <span className="flex h-9 w-9 items-center justify-center rounded-full">
              <Icon size={20} weight="regular" className="text-ls-gray-500" />
            </span>
            <span className="text-[11px] leading-none text-ls-gray-500">{label}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}

export function MobileBottomNav({ cartBadge }: { cartBadge?: ReactNode | null }) {
  return (
    <nav
      className="ls-safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-ls-gray-200 bg-ls-white pt-2 md:hidden"
      aria-label="Navigation principale"
    >
      <Suspense fallback={<NavItemsFallback />}>
        <NavItems cartBadge={cartBadge} />
      </Suspense>
    </nav>
  )
}