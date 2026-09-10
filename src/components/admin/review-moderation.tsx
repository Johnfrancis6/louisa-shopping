'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, X } from 'lucide-react'
import { approveReview, rejectReview } from '@/lib/actions/admin/reviews'
import { cn } from '@/lib/utils'

export function ReviewModeration({ id, status }: { id: string; status: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()

  function act(fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) {
    start(async () => {
      const res = await fn()
      if (res.ok) {
        toast.success(msg)
        router.refresh()
      } else {
        toast.error(res.error ?? 'Échec')
      }
    })
  }

  const base =
    'inline-flex h-10 items-center justify-center gap-1.5 rounded-ls-sm px-3.5 text-sm font-medium transition-colors disabled:opacity-40'

  return (
    <div className="flex flex-wrap gap-2">
      {status !== 'approved' && (
        <button
          type="button"
          disabled={pending}
          onClick={() => act(() => approveReview(id), 'Avis approuvé')}
          className={cn(base, 'bg-ls-success-bg text-ls-success hover:brightness-95')}
        >
          <Check size={16} />
          Approuver
        </button>
      )}
      {status !== 'rejected' && (
        <button
          type="button"
          disabled={pending}
          onClick={() => act(() => rejectReview(id), 'Avis rejeté')}
          className={cn(base, 'border border-ls-danger/30 text-ls-danger hover:bg-ls-danger-bg')}
        >
          <X size={16} />
          Rejeter
        </button>
      )}
    </div>
  )
}
