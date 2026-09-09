// src/components/storefront/cart/empty-cart.tsx
import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'

export function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-[var(--color-ls-surface-2)] flex items-center justify-center mb-5">
        <ShoppingCart size={36} strokeWidth={1} className="text-[var(--color-ls-text-muted)]" />
      </div>
      <h2 className="text-lg font-semibold text-[var(--color-ls-text)] mb-2">
        Ton panier est vide
      </h2>
      <p className="text-sm text-[var(--color-ls-text-muted)] mb-8 max-w-xs">
        Explore le catalogue et ajoute des articles pour commencer ta commande.
      </p>
      <Link
        href="/"
        className="px-6 py-3 rounded-full bg-[var(--color-ls-primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        Découvrir le catalogue
      </Link>
    </div>
  )
}