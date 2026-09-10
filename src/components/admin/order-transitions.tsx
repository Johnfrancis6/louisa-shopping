'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { requestOrderStatusTransition } from '@/lib/actions/admin/orders'
import { allowedNextStatuses } from '@/lib/order-transitions'
import { ORDER_STATUS_LABELS } from '@/lib/orders-display'
import type { OrderStatus } from '@/lib/db/schema'

export function OrderTransitions({
  orderId,
  status,
}: {
  orderId: string
  status: OrderStatus
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const next = allowedNextStatuses(status)

  if (next.length === 0) {
    return <span className="text-xs text-ls-gray-400">—</span>
  }

  function go(target: OrderStatus) {
    startTransition(async () => {
      const res = await requestOrderStatusTransition(orderId, status, target)
      if (res.ok) {
        toast.success(`Commande → ${ORDER_STATUS_LABELS[target]}`)
        router.refresh()
      } else {
        toast.error(res.error ?? 'Transition refusée')
      }
    })
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {next.map((target) => (
        <button
          key={target}
          type="button"
          disabled={pending}
          onClick={() => go(target)}
          className={`rounded border px-2 py-1 text-xs font-medium disabled:opacity-40 ${
            target === 'cancelled'
              ? 'border-red-200 text-red-700 hover:bg-red-50'
              : 'border-ls-gray-300 hover:bg-ls-gray-50'
          }`}
        >
          {ORDER_STATUS_LABELS[target]}
        </button>
      ))}
    </div>
  )
}
