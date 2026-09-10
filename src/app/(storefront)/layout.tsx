import { Suspense } from 'react'
import { Navbar } from '@/components/storefront/layout/navbar'
import { MobileBottomNav } from '@/components/storefront/layout/mobile-bottom-nav'
import { CartBadge, CartBadgeSkeleton } from '@/components/storefront/layout/cart-badge'
import { Footer } from '@/components/storefront/layout/footer'
import { SearchProvider } from '@/components/storefront/search/search-modal'

/**
 * Layout du groupe (storefront) : homepage, catalogue, fiche produit, panier,
 * compte, commandes. Porte la chrome storefront (navbar + bottom nav mobile).
 * Le checkout (tunnel) vivra dans un groupe séparé pour ne PAS hériter de ce
 * layout — pas de navbar pendant l'achat.
 */
export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SearchProvider>
      <div className="flex min-h-svh flex-col bg-ls-gray-50">
        <Navbar />

        {/* L'espace de la bottom nav mobile fixe est réservé par le footer
            (padding bas calé sur --ls-bottom-nav-h). */}
        <main className="min-h-[calc(100svh-3.5rem)] flex-1">
          {children}
        </main>

        <Footer />

        <MobileBottomNav
          cartBadge={
            <Suspense fallback={<CartBadgeSkeleton />}>
              <CartBadge />
            </Suspense>
          }
        />
      </div>
    </SearchProvider>
  )
}
