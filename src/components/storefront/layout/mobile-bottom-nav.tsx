// src/components/storefront/mobile-bottom-nav.tsx
'use client'

import { Suspense, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House, Store, ShoppingBag, User } from 'lucide-react'

const ITEMS = [
  { href: '/', label: 'Accueil', Icon: House },
  { href: '/catalogue', label: 'Boutique', Icon: Store },
  { href: '/panier', label: 'Panier', Icon: ShoppingBag },
  { href: '/compte', label: 'Compte', Icon: User },
] as const

const CELL = 'flex min-h-11 min-w-11 flex-col items-center gap-1 px-3 py-1'

function ItemInner({
  Icon,
  label,
  isActive,
  cartBadge,
}: {
  Icon: (typeof ITEMS)[number]['Icon']
  label: string
  isActive: boolean
  cartBadge?: ReactNode | null
}) {
  return (
    <>
      <span className="relative flex h-8 w-8 items-center justify-center">
        <Icon
          size={22}
          strokeWidth={2.25}
          className={
            'transition-colors duration-[var(--duration-ls-fast)] ' +
            (isActive ? 'text-ls-violet' : 'text-ls-gray-500')
          }
        />
        {cartBadge}
      </span>
      <span
        className={
          'text-[11px] leading-none transition-colors duration-[var(--duration-ls-fast)] ' +
          (isActive ? 'font-medium text-ls-violet' : 'text-ls-gray-500')
        }
      >
        {label}
      </span>
    </>
  )
}

/** Sous-composant isolé — usePathname() ici, wrappé dans Suspense par le parent */
function NavItems({ cartBadge }: { cartBadge?: ReactNode | null }) {
  const pathname = usePathname()

  return (
    <ul className="flex h-14 items-center justify-around">
      {ITEMS.map(({ href, label, Icon }) => {
        const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <li key={href}>
            <Link href={href} aria-current={isActive ? 'page' : undefined} className={CELL}>
              <ItemInner
                Icon={Icon}
                label={label}
                isActive={isActive}
                cartBadge={href === '/panier' ? cartBadge : null}
              />
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
    <ul className="flex h-14 items-center justify-around">
      {ITEMS.map(({ href, label, Icon }) => (
        <li key={href}>
          <div className={CELL}>
            <span className="flex h-8 w-8 items-center justify-center">
              <Icon size={22} strokeWidth={2.25} className="text-ls-gray-500" />
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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ls-gray-200 bg-ls-white pb-[env(safe-area-inset-bottom,0px)] md:hidden"
      aria-label="Navigation principale"
    >
      <Suspense fallback={<NavItemsFallback />}>
        <NavItems cartBadge={cartBadge} />
      </Suspense>
    </nav>
  )
}
