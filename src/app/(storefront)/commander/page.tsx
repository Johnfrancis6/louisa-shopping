import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-guards'
import { peekCart } from '@/lib/actions/cart'
import { formatPrice } from '@/lib/utils/format'
import { CheckoutForm } from '@/components/storefront/checkout/checkout-form'

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
  const phone =
    (session.user as { phone?: string }).phone ?? ''

  return (
    <div className="mt-6 flex flex-col gap-8">
      <section className="rounded-ls-card border border-ls-gray-200 bg-ls-white p-4">
        <h2 className="text-ls-h2 text-ls-gray-900">Récapitulatif</h2>
        <ul className="mt-3 flex flex-col gap-2 text-ls-body">
          {cart.items.map((i) => (
            <li key={i.variantId} className="flex justify-between gap-2">
              <span className="text-ls-gray-500">
                {i.productName}
                {[i.size, i.color].filter(Boolean).length
                  ? ` (${[i.size, i.color].filter(Boolean).join(' / ')})`
                  : ''}{' '}
                ×{i.qty}
              </span>
              <span className="font-medium text-ls-gray-900">
                {formatPrice(i.unitPrice * i.qty)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-ls-gray-200 pt-3 text-ls-body font-semibold text-ls-gray-900">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
        <p className="mt-2 text-ls-label text-ls-gray-500">
          Frais de livraison confirmés par le vendeur sur WhatsApp.
        </p>
      </section>

      <CheckoutForm defaultName={session.user.name ?? ''} defaultPhone={phone} />
    </div>
  )
}
