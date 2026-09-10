// src/app/(storefront)/panier/page.tsx
import { Suspense } from 'react'
import { peekCart } from '@/lib/actions/cart'
import { CartClient } from '@/components/storefront/cart/cart-client'
import PanierLoading from './loading'

export default function PanierPage() {
  return (
    <div className="px-4 pt-6 pb-24 max-w-2xl mx-auto lg:max-w-5xl">
      <h1 className="text-2xl font-semibold text-ls-gray-900 mb-6">
        Mon panier
      </h1>
      <Suspense fallback={<PanierLoading />}>
        <CartContents />
      </Suspense>
    </div>
  )
}

async function CartContents() {
  const cart = await peekCart()
  return <CartClient initialItems={cart.items} />
}
