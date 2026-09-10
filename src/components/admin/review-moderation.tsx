'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { approveReview, rejectReview } from '@/lib/actions/admin/reviews'

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

  if (status !== 'pending') {
    return <span className="text-xs text-ls-gray-400">{status}</span>
  }

  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() => act(() => approveReview(id), 'Avis approuvé')}
        className="rounded border border-green-200 px-2 py-1 text-xs text-green-700 hover:bg-green-50 disabled:opacity-40"
      >
        Approuver
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => act(() => rejectReview(id), 'Avis rejeté')}
        className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-40"
      >
        Rejeter
      </button>
    </div>
  )
}
