import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-guards'
import { getMyOrders } from '@/lib/actions/orders'
import { formatPrice } from '@/lib/utils/format'
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  readSnapshot,
} from '@/lib/orders-display'
import { SignOutButton } from '@/components/storefront/auth/sign-out-button'
import type { OrderStatus } from '@/lib/db/schema'

export const metadata = { title: 'Mon compte — Louisa Shopping' }

export default function ComptePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-ls-h1 text-ls-gray-900">Mon compte</h1>
      <Suspense fallback={<div className="ls-skeleton mt-6 h-64 rounded-ls-card" />}>
        <AccountContent />
      </Suspense>
    </div>
  )
}

async function AccountContent() {
  const session = await getSession()
  if (!session?.user) redirect('/connexion?next=/compte')

  const { orders } = await getMyOrders()

  return (
    <div className="mt-6 flex flex-col gap-8">
      <section className="rounded-ls-card border border-ls-gray-200 bg-ls-white p-4">
        <p className="text-ls-body font-medium text-ls-gray-900">{session.user.name}</p>
        <p className="text-ls-label text-ls-gray-500">{session.user.email}</p>
        <div className="mt-4">
          <SignOutButton />
        </div>
      </section>

      <section>
        <h2 className="text-ls-h2 text-ls-gray-900">Mes commandes</h2>
        {orders.length === 0 ? (
          <p className="mt-3 text-ls-body text-ls-gray-500">
            Aucune commande pour l&apos;instant.{' '}
            <Link href="/catalogue" className="text-ls-accent underline">
              Voir le catalogue
            </Link>
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-4">
            {orders.map((order) => {
              const items = readSnapshot(order.itemsSnapshot)
              return (
                <li
                  key={order.id}
                  className="rounded-ls-card border border-ls-gray-200 bg-ls-white p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-ls-label text-ls-gray-500">
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })
                        : ''}
                    </span>
                    <span className="rounded-full bg-ls-accent-light px-2 py-0.5 text-[12px] font-medium text-ls-accent-dark">
                      {ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status}
                    </span>
                  </div>
                  <ul className="mt-2 flex flex-col gap-1 text-ls-label text-ls-gray-500">
                    {items.map((it) => (
                      <li key={it.variant_id}>
                        {it.product_name} ×{it.qty}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 flex items-center justify-between text-ls-body text-ls-gray-900">
                    <span>{PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}</span>
                    <span className="font-semibold">{formatPrice(order.total)}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
