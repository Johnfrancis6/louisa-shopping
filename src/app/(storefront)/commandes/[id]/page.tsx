import { Suspense } from 'react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import { getSession } from '@/lib/auth-guards'
import { getOrder } from '@/lib/actions/orders'
import { getOrderWhatsappUrl } from '@/lib/actions/checkout'
import { formatPrice } from '@/lib/utils/format'
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  readSnapshot,
  readDeliveryAddress,
} from '@/lib/orders-display'
import type { OrderStatus } from '@/lib/db/schema'

export const metadata = { title: 'Suivi de commande — Louisa Shopping' }

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Suspense fallback={<div className="ls-skeleton h-80 rounded-ls-card" />}>
        <OrderContent params={params} />
      </Suspense>
    </div>
  )
}

async function OrderContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const session = await getSession()
  if (!session?.user) redirect(`/connexion?next=/commandes/${id}`)

  const result = await getOrder(id)
  if (!result.success || !result.order) notFound()

  const order = result.order
  const items = readSnapshot(order.itemsSnapshot)
  const address = readDeliveryAddress(order.deliveryAddress)
  const status = order.status as OrderStatus
  const waUrl = status === 'pending_whatsapp' ? await getOrderWhatsappUrl(id) : null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-ls-h1 text-ls-gray-900">Commande enregistrée</h1>
        <p className="mt-1 text-ls-body text-ls-gray-500">
          Référence {order.id.slice(0, 8)} · {ORDER_STATUS_LABELS[status] ?? status}
        </p>
      </div>

      {status === 'pending_whatsapp' && (
        <div className="rounded-ls-card border border-ls-accent-light bg-ls-accent-light p-4">
          <p className="text-ls-body text-ls-accent-dark">
            Dernière étape : confirmez votre commande avec le vendeur sur WhatsApp.
          </p>
          {waUrl ? (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-semibold text-white"
            >
              <MessageCircle size={20} />
              Confirmer sur WhatsApp
            </a>
          ) : (
            <p className="mt-2 text-ls-label text-ls-accent-dark">
              Le vendeur vous contactera — numéro WhatsApp non configuré.
            </p>
          )}
        </div>
      )}

      <section className="rounded-ls-card border border-ls-gray-200 bg-ls-white p-4">
        <ul className="flex flex-col gap-2 text-ls-body">
          {items.map((it) => (
            <li key={it.variant_id} className="flex justify-between gap-2">
              <span className="text-ls-gray-500">
                {it.product_name}
                {[it.size, it.color].filter(Boolean).length
                  ? ` (${[it.size, it.color].filter(Boolean).join(' / ')})`
                  : ''}{' '}
                ×{it.qty}
              </span>
              <span className="font-medium text-ls-gray-900">
                {formatPrice(it.unit_price_at_order * it.qty)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-ls-gray-200 pt-3 font-semibold text-ls-gray-900">
          <span>Total</span>
          <span>{formatPrice(order.total)}</span>
        </div>
        <p className="mt-2 text-ls-label text-ls-gray-500">
          Règlement : {PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}
        </p>
      </section>

      {address && (
        <section className="rounded-ls-card border border-ls-gray-200 bg-ls-white p-4">
          <h2 className="text-ls-h2 text-ls-gray-900">Livraison</h2>
          <div className="mt-2 text-ls-body text-ls-gray-900">
            <p>{address.fullName}</p>
            <p className="text-ls-gray-500">{address.phone}</p>
            <p className="text-ls-gray-500">{address.city}</p>
            {address.directions && (
              <p className="text-ls-gray-500">{address.directions}</p>
            )}
          </div>
        </section>
      )}

      <Link href="/compte" className="text-ls-body text-ls-accent underline">
        Voir toutes mes commandes
      </Link>
    </div>
  )
}
