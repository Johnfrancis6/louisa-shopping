// src/components/storefront/navbar.tsx
import { Suspense } from 'react'
import Link from 'next/link'
import { MagnifyingGlass, ShoppingBag, User } from '@phosphor-icons/react/dist/ssr'
import { Logo } from "./logo"
import { CartBadge, CartBadgeSkeleton } from "./cart-badge"

/**
 * Barre du haut, commune mobile + desktop.
 * Mobile : logo centré + icône panier seulement (la navigation principale vit
 * dans MobileBottomNav, en bas — cf. mobile-bottom-nav.tsx).
 * Desktop (md:) : logo + champ recherche + panier + compte, tout sur une ligne.
 *
 * Recherche : stub pour l'instant (input non branché). Comportement réel —
 * mobile = modale Command(cmdk), desktop = navigation vers /recherche?q=... —
 * à implémenter à l'étape 4 (voir brief), pas dans ce socle de layout.
 */
export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-ls-gray-200 bg-ls-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />

        {/* Recherche desktop uniquement — cf. note stub ci-dessus */}
        <div className="hidden flex-1 max-w-md md:flex">
          <label className="relative w-full">
            <span className="sr-only">Rechercher un produit</span>
            <MagnifyingGlass
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ls-gray-500"
              size={18}
              weight="regular"
            />
            <input
              type="search"
              placeholder="Rechercher un produit…"
              className="w-full rounded-[--radius-ls-input] border border-ls-gray-200 bg-ls-gray-50 py-2 pl-10 pr-3 text-ls-body text-ls-gray-900 outline-none focus:border-ls-accent focus:ring-1 focus:ring-ls-accent"
            />
          </label>
        </div>

        <nav className="flex items-center gap-1">
          {/* Recherche mobile : icône seule, ouvre la modale Command (à câbler étape 4) */}
          <Link
            href="/recherche"
            className="flex h-11 w-11 items-center justify-center rounded-[--radius-ls-btn] text-ls-gray-900 hover:bg-ls-accent-light md:hidden"
            aria-label="Rechercher"
          >
            <MagnifyingGlass size={22} weight="regular" />
          </Link>

          <Link
            href="/panier"
            className="relative flex h-11 w-11 items-center justify-center rounded-[--radius-ls-btn] text-ls-gray-900 hover:bg-ls-accent-light"
            aria-label="Panier"
          >
            <ShoppingBag size={22} weight="regular" />
            <Suspense fallback={<CartBadgeSkeleton />}>
              <CartBadge />
            </Suspense>
          </Link>

          <Link
            href="/compte"
            className="hidden h-11 w-11 items-center justify-center rounded-[--radius-ls-btn] text-ls-gray-900 hover:bg-ls-accent-light md:flex"
            aria-label="Mon compte"
          >
            <User size={22} weight="regular" />
          </Link>
        </nav>
      </div>
    </header>
  )
}