// src/components/storefront/cart/empty-cart.tsx
import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'

export function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-ls-gray-50 flex items-center justify-center mb-5">
        <ShoppingCart size={36} strokeWidth={1} className="text-ls-gray-500" />
      </div>
      <h2 className="text-lg font-semibold text-ls-gray-900 mb-2">
        Votre panier est vide
      </h2>
      <p className="text-sm text-ls-gray-500 mb-8 max-w-xs">
        Parcourez le catalogue et ajoutez des articles pour commencer votre commande.
      </p>
      <Link
        href="/catalogue"
        className="px-6 py-3 rounded-full bg-ls-violet text-ls-white text-sm font-semibold hover:bg-ls-violet-dark transition-colors"
      >
        Découvrir le catalogue
      </Link>
    </div>
  )
}