'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, Truck, X } from 'lucide-react'
import { requestOrderStatusTransition } from '@/lib/actions/admin/orders'
import { allowedNextStatuses } from '@/lib/order-transitions'
import { ORDER_STATUS_LABELS } from '@/lib/orders-display'
import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/lib/db/schema'

const ICON: Partial<Record<OrderStatus, typeof Check>> = {
  confirmed: Check,
  delivered: Truck,
  cancelled: X,
}

const ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  confirmed: 'Confirmer',
  delivered: 'Marquer livrée',
  cancelled: 'Annuler',
}

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
    return (
      <p className="text-sm text-ls-gray-400">
        {status === 'delivered' ? 'Commande livrée.' : status === 'cancelled' ? 'Commande annulée.' : 'Aucune action.'}
      </p>
    )
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
    <div className="flex flex-wrap gap-2">
      {next.map((target) => {
        const Icon = ICON[target]
        const danger = target === 'cancelled'
        return (
          <button
            key={target}
            type="button"
            disabled={pending}
            onClick={() => go(target)}
            className={cn(
              'inline-flex h-10 items-center justify-center gap-1.5 rounded-ls-sm px-3.5 text-sm font-medium transition-colors disabled:opacity-40',
              danger
                ? 'border border-ls-danger/30 text-ls-danger hover:bg-ls-danger-bg'
                : 'bg-ls-violet text-white hover:bg-ls-violet-dark',
            )}
          >
            {Icon && <Icon size={16} />}
            {ACTION_LABEL[target] ?? ORDER_STATUS_LABELS[target]}
          </button>
        )
      })}
    </div>
  )
}
