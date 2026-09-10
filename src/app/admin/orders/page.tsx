import { Suspense } from 'react'
import Link from 'next/link'
import { connection } from 'next/server'
import { Download } from 'lucide-react'
import { listOrdersAdmin } from '@/lib/db/admin'
import { formatPrice } from '@/lib/utils/format'
import { PAYMENT_METHOD_LABELS, readSnapshot, readDeliveryAddress } from '@/lib/orders-display'
import { OrderStatusBadge } from '@/components/admin/OrderStatusBadge'
import { OrderTransitions } from '@/components/admin/order-transitions'
import { PageHeader, Card, CardList, EmptyState, LoadingRows, btnOutline } from '@/components/admin/ui'
import type { OrderStatus } from '@/lib/db/schema'

export default function AdminOrdersPage() {
  return (
    <div>
      <PageHeader
        title="Commandes"
        description="Valider une commande reçue sur WhatsApp, puis la marquer livrée."
        action={
          <Link href="/admin/orders/export" className={btnOutline}>
            <Download size={16} />
            Export CSV
          </Link>
        }
      />
      <Suspense fallback={<LoadingRows />}>
        <OrdersList />
      </Suspense>
    </div>
  )
}

async function OrdersList() {
  await connection()
  let orders: Awaited<ReturnType<typeof listOrdersAdmin>> = []
  try {
    orders = await listOrdersAdmin()
  } catch (err) {
    console.error('[admin/orders]', err)
  }

  if (orders.length === 0) return <EmptyState>Aucune commande.</EmptyState>

  return (
    <CardList>
      {orders.map((o) => {
        const items = readSnapshot(o.itemsSnapshot)
        const count = items.reduce((n, it) => n + it.qty, 0)
        const address = readDeliveryAddress(o.deliveryAddress)
        return (
          <Card key={o.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-ls-gray-900">{o.customerName ?? '—'}</p>
                <p className="text-xs text-ls-gray-500">
                  {o.customerPhone ?? ''}
                  {o.createdAt
                    ? ` · ${new Date(o.createdAt).toLocaleDateString('fr-FR')}`
                    : ''}
                </p>
              </div>
              <OrderStatusBadge status={o.status} />
            </div>

            <ul className="rounded-ls-sm bg-ls-gray-50 p-3 text-sm text-ls-gray-700">
              {items.map((it) => (
                <li key={it.variant_id} className="flex justify-between gap-3 py-0.5">
                  <span className="min-w-0 truncate">
                    {it.product_name}
                    {[it.size, it.color].filter(Boolean).length
                      ? ` (${[it.size, it.color].filter(Boolean).join(' / ')})`
                      : ''}
                  </span>
                  <span className="shrink-0 tabular-nums text-ls-gray-500">×{it.qty}</span>
                </li>
              ))}
            </ul>

            <div className="grid gap-1 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-ls-gray-500">Total ({count} art.)</span>
                <span className="font-semibold text-ls-gray-900">{formatPrice(o.total)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-ls-gray-500">Règlement</span>
                <span>{PAYMENT_METHOD_LABELS[o.paymentMethod] ?? o.paymentMethod}</span>
              </div>
              {o.whatsappRef && (
                <div className="flex justify-between gap-3">
                  <span className="text-ls-gray-500">Réf. WhatsApp</span>
                  <span className="tabular-nums">{o.whatsappRef}</span>
                </div>
              )}
            </div>

            {address ? (
              <div className="border-t border-ls-gray-100 pt-3 text-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-ls-gray-400">
                  Livraison
                </p>
                <p className="mt-1 text-ls-gray-900">{address.city}</p>
                <p className="text-ls-gray-500">
                  {address.fullName} · {address.phone}
                </p>
                {address.directions && (
                  <p className="text-ls-gray-500">{address.directions}</p>
                )}
              </div>
            ) : null}

            <div className="border-t border-ls-gray-100 pt-3">
              <OrderTransitions orderId={o.id} status={o.status as OrderStatus} />
            </div>
          </Card>
        )
      })}
    </CardList>
  )
}
