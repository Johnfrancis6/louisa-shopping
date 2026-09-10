// src/components/storefront/layout/mobile-bottom-nav.tsx
'use client'

import { Suspense, type ReactNode, type ComponentType } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House, Store, ShoppingBag, User, LayoutDashboard } from 'lucide-react'
import { useSession } from '@/lib/auth-client'

type Item = {
  href: string
  label: string
  Icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
}

const BASE_ITEMS: Item[] = [
  { href: '/', label: 'Accueil', Icon: House },
  { href: '/catalogue', label: 'Boutique', Icon: Store },
  { href: '/panier', label: 'Panier', Icon: ShoppingBag },
  { href: '/compte', label: 'Compte', Icon: User },
]

const ADMIN_ITEM: Item = { href: '/admin', label: 'Admin', Icon: LayoutDashboard }

const CELL = 'flex min-h-11 flex-1 flex-col items-center gap-1 px-1 py-1'

function ItemInner({
  Icon,
  label,
  isActive,
  cartBadge,
}: {
  Icon: Item['Icon']
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
function NavItems({
  items,
  cartBadge,
}: {
  items: Item[]
  cartBadge?: ReactNode | null
}) {
  const pathname = usePathname()

  return (
    <ul className="flex h-14 items-stretch">
      {items.map(({ href, label, Icon }) => {
        const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <li key={href} className="flex flex-1">
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
function NavItemsFallback({ items }: { items: Item[] }) {
  return (
    <ul className="flex h-14 items-stretch">
      {items.map(({ href, label, Icon }) => (
        <li key={href} className="flex flex-1">
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
  const { data } = useSession()
  const isAdmin = data?.user?.role === 'admin'
  const items = isAdmin ? [...BASE_ITEMS, ADMIN_ITEM] : BASE_ITEMS

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ls-gray-200 bg-ls-white pb-[env(safe-area-inset-bottom,0px)] md:hidden"
      aria-label="Navigation principale"
    >
      <Suspense fallback={<NavItemsFallback items={items} />}>
        <NavItems items={items} cartBadge={cartBadge} />
      </Suspense>
    </nav>
  )
}
