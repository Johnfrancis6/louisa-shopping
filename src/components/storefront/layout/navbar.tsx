// src/components/storefront/navbar.tsx
import { Suspense } from 'react'
import Link from 'next/link'
import { ShoppingBag, User } from 'lucide-react'
import { Logo } from './logo'
import { CartBadge, CartBadgeSkeleton } from './cart-badge'
import { NavDrawer } from './nav-drawer'
import { NavbarLinks } from './nav-links'
import { AdminNavLink } from './admin-nav-link'
import { SearchTrigger } from '@/components/storefront/search/search-modal'

/**
 * Barre du haut, commune mobile + desktop.
 * La barre de recherche (déclencheur façon input → command-palette) est
 * TOUJOURS visible, mobile compris. Raccourci ⌘K / Ctrl K.
 * Mobile / tablette : logo + recherche + panier + hamburger (`< lg`).
 * Desktop (`lg:`) : logo + liens de nav + recherche + panier + compte.
 */
export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-ls-gray-200 bg-ls-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-3 md:gap-4 md:px-4">
        <Logo priority />

        <NavbarLinks className="hidden shrink-0 items-center gap-0.5 lg:flex" />

        <div className="min-w-0 flex-1 md:ml-auto md:max-w-xs">
          <SearchTrigger />
        </div>

        {/* Grappe utilitaire, pas une région de navigation : un <div>. Les
            landmarks `nav` du storefront sont NavbarLinks, le drawer, la
            bottom-nav et le pied de page. */}
        <div className="flex shrink-0 items-center gap-1">
          {/* Pas d'`aria-label` ici : il écraserait le contenu et le compteur du
              panier ne serait jamais annoncé. Le nom se compose du texte
              `sr-only` + de la pastille. */}
          <Link
            href="/panier"
            className="relative flex h-11 w-11 items-center justify-center rounded-ls-sm text-ls-gray-900 hover:bg-ls-gray-100"
          >
            <ShoppingBag size={22} aria-hidden="true" />
            <span className="sr-only">Panier</span>
            <Suspense fallback={<CartBadgeSkeleton />}>
              <CartBadge />
            </Suspense>
          </Link>

          <Link
            href="/compte"
            className="hidden h-11 w-11 items-center justify-center rounded-ls-sm text-ls-gray-900 hover:bg-ls-gray-100 md:flex"
            aria-label="Mon compte"
          >
            <User size={22} />
          </Link>

          <AdminNavLink />

          <NavDrawer />
        </div>
      </div>
    </header>
  )
}
