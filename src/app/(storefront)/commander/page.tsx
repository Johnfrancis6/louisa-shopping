import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-guards'
import { peekCart } from '@/lib/actions/cart'
import { getMyDeliveryAddress } from '@/lib/actions/checkout'
import { CheckoutFlow } from '@/components/storefront/checkout/checkout-flow'

export const metadata = { title: 'Commander — Louisa Shopping' }

export default function CommanderPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-ls-h1 text-ls-gray-900">Finaliser la commande</h1>
      <Suspense fallback={<div className="ls-skeleton mt-6 h-96 rounded-ls-card" />}>
        <CheckoutContents />
      </Suspense>
    </div>
  )
}

async function CheckoutContents() {
  const session = await getSession()
  if (!session?.user) redirect('/connexion?next=/commander')

  const cart = await peekCart()
  if (cart.items.length === 0) redirect('/panier')

  const total = cart.items.reduce((s, i) => s + i.unitPrice * i.qty, 0)
  const defaultAddress = await getMyDeliveryAddress()

  return (
    <div className="mt-6">
      <CheckoutFlow items={cart.items} total={total} defaultAddress={defaultAddress} />
    </div>
  )
}
