import { Suspense } from 'react'
import Link from 'next/link'
import { connection } from 'next/server'
import { listOrdersAdmin } from '@/lib/db/admin'
import { formatPrice } from '@/lib/utils/format'
import { PAYMENT_METHOD_LABELS, readSnapshot, readDeliveryAddress } from '@/lib/orders-display'
import { OrderStatusBadge } from '@/components/admin/OrderStatusBadge'
import { OrderTransitions } from '@/components/admin/order-transitions'
import type { OrderStatus } from '@/lib/db/schema'

export default function AdminOrdersPage() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Commandes</h1>
        <Link
          href="/admin/orders/export"
          className="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
        >
          Export CSV
        </Link>
      </div>
      <Suspense fallback={<p className="text-sm text-neutral-500">Chargement…</p>}>
        <OrdersTable />
      </Suspense>
    </div>
  )
}

async function OrdersTable() {
  await connection()
  let orders: Awaited<ReturnType<typeof listOrdersAdmin>> = []
  try {
    orders = await listOrdersAdmin()
  } catch (err) {
    console.error('[admin/orders]', err)
  }

  return (
    <div className="overflow-x-auto rounded border border-neutral-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs uppercase text-neutral-500">
          <tr>
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Client</th>
            <th className="px-3 py-2">Livraison</th>
            <th className="px-3 py-2">Articles</th>
            <th className="px-3 py-2">Total</th>
            <th className="px-3 py-2">Règlement</th>
            <th className="px-3 py-2">Statut</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 && (
            <tr>
              <td colSpan={8} className="px-3 py-8 text-center text-neutral-400">
                Aucune commande.
              </td>
            </tr>
          )}
          {orders.map((o) => {
            const items = readSnapshot(o.itemsSnapshot)
            const count = items.reduce((n, it) => n + it.qty, 0)
            const address = readDeliveryAddress(o.deliveryAddress)
            return (
              <tr key={o.id} className="border-b border-neutral-100 align-top last:border-0">
                <td className="whitespace-nowrap px-3 py-2 text-neutral-500">
                  {o.createdAt ? new Date(o.createdAt).toLocaleDateString('fr-FR') : ''}
                </td>
                <td className="px-3 py-2">
                  <div>{o.customerName ?? '—'}</div>
                  <div className="text-xs text-neutral-500">{o.customerPhone ?? ''}</div>
                </td>
                <td className="px-3 py-2 text-neutral-600">
                  {address ? (
                    <div className="max-w-[16rem]">
                      <div>{address.city}</div>
                      <div className="text-xs text-neutral-500">
                        {address.fullName} · {address.phone}
                      </div>
                      {address.directions && (
                        <div className="text-xs text-neutral-400">{address.directions}</div>
                      )}
                    </div>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-neutral-500">{count}</td>
                <td className="px-3 py-2 font-medium">{formatPrice(o.total)}</td>
                <td className="px-3 py-2 text-neutral-500">
                  {PAYMENT_METHOD_LABELS[o.paymentMethod] ?? o.paymentMethod}
                </td>
                <td className="px-3 py-2">
                  <OrderStatusBadge status={o.status} />
                </td>
                <td className="px-3 py-2">
                  <OrderTransitions orderId={o.id} status={o.status as OrderStatus} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
