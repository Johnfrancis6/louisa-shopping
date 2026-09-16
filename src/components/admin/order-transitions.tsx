'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, Truck, X } from 'lucide-react'
import { requestOrderStatusTransition, setOrderWhatsappRef } from '@/lib/actions/admin/orders'
import { allowedNextStatuses } from '@/lib/order-transitions'
import { ORDER_STATUS_LABELS } from '@/lib/orders-display'
import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/lib/db/schema'

/** pending_whatsapp/confirmed uniquement — cf. setOrderWhatsappRef (garde serveur, répétée ici pour l'affichage). */
const WHATSAPP_REF_EDITABLE: OrderStatus[] = ['pending_whatsapp', 'confirmed']

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
  whatsappRef,
}: {
  orderId: string
  status: OrderStatus
  /** Réf. de l'échange WhatsApp déjà notée — undefined/null si non renseignée. */
  whatsappRef?: string | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [refPending, startRefTransition] = useTransition()
  const [refDraft, setRefDraft] = useState(whatsappRef ?? '')
  const next = allowedNextStatuses(status)
  const refEditable = WHATSAPP_REF_EDITABLE.includes(status)

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

  function saveRef() {
    startRefTransition(async () => {
      const res = await setOrderWhatsappRef(orderId, refDraft)
      if (res.ok) {
        toast.success('Réf. WhatsApp enregistrée')
        router.refresh()
      } else {
        toast.error(res.error ?? 'Échec de l\'enregistrement')
      }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {refEditable && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={refDraft}
            onChange={(e) => setRefDraft(e.target.value)}
            placeholder="Réf. WhatsApp (ex. nom du contact, date de l'échange…)"
            maxLength={64}
            disabled={refPending}
            className="h-9 flex-1 rounded-ls-sm border border-ls-gray-200 bg-ls-gray-50 px-3 text-sm text-ls-gray-900 placeholder:text-ls-gray-400 focus:border-ls-violet focus:outline-none disabled:opacity-40"
          />
          <button
            type="button"
            disabled={refPending || refDraft.trim() === (whatsappRef ?? '')}
            onClick={saveRef}
            className="h-9 shrink-0 rounded-ls-sm border border-ls-gray-200 px-3 text-sm font-medium text-ls-gray-900 transition-colors hover:bg-ls-gray-50 disabled:opacity-40"
          >
            Enregistrer
          </button>
        </div>
      )}

      {next.length === 0 ? (
        <p className="text-sm text-ls-gray-400">
          {status === 'delivered' ? 'Commande livrée.' : status === 'cancelled' ? 'Commande annulée.' : 'Aucune action.'}
        </p>
      ) : (
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
      )}
    </div>
  )
}
