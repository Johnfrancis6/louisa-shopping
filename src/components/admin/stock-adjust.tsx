'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { adjustVariantStock } from '@/lib/actions/admin/variants'

export function StockAdjust({ variantId, stockQty }: { variantId: string; stockQty: number }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [delta, setDelta] = useState('')

  function apply() {
    const d = Number(delta)
    if (!Number.isInteger(d) || d === 0) {
      toast.error('Entrez un entier non nul (ex. -2 ou 5)')
      return
    }
    start(async () => {
      const res = await adjustVariantStock(variantId, d)
      if (res.ok) {
        toast.success(`Stock → ${res.newQty}`)
        setDelta('')
        router.refresh()
      } else {
        toast.error(res.error ?? 'Échec')
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <span className="w-10 text-right tabular-nums">{stockQty}</span>
      <input
        value={delta}
        onChange={(e) => setDelta(e.target.value)}
        placeholder="±"
        inputMode="numeric"
        className="w-16 rounded border border-neutral-300 px-2 py-1 text-sm"
      />
      <button
        type="button"
        disabled={pending}
        onClick={apply}
        className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50 disabled:opacity-40"
      >
        Ajuster
      </button>
    </div>
  )
}
