'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Minus, Plus } from 'lucide-react'
import { adjustVariantStock } from '@/lib/actions/admin/variants'
import { fieldInput, btnOutline } from './ui'

export function StockAdjust({ variantId, stockQty }: { variantId: string; stockQty: number }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [delta, setDelta] = useState('')

  function apply(raw?: number) {
    const d = raw ?? Number(delta)
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
      <button
        type="button"
        aria-label="Retirer 1"
        disabled={pending || stockQty === 0}
        onClick={() => apply(-1)}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-ls-sm border border-ls-gray-300 text-ls-gray-700 hover:bg-ls-gray-50 disabled:opacity-40"
      >
        <Minus size={16} />
      </button>
      <button
        type="button"
        aria-label="Ajouter 1"
        disabled={pending}
        onClick={() => apply(1)}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-ls-sm border border-ls-gray-300 text-ls-gray-700 hover:bg-ls-gray-50 disabled:opacity-40"
      >
        <Plus size={16} />
      </button>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          apply()
        }}
        className="flex flex-1 items-center gap-2"
      >
        <input
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          placeholder="±10"
          inputMode="numeric"
          className={fieldInput + ' flex-1'}
        />
        <button type="submit" disabled={pending} className={btnOutline}>
          Ajuster
        </button>
      </form>
    </div>
  )
}
