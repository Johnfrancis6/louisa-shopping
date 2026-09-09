'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateWhatsappConfig } from '@/lib/actions/admin/whatsapp-config'

export function WhatsappConfigForm({
  numero,
  lienWa,
}: {
  numero: string
  lienWa: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [f, setF] = useState({ numero, lienWa })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    start(async () => {
      const res = await updateWhatsappConfig(f)
      if (res.ok) {
        toast.success('Configuration enregistrée')
        router.refresh()
      } else {
        toast.error(res.error ?? 'Échec')
      }
    })
  }

  return (
    <form onSubmit={submit} className="flex max-w-md flex-col gap-4 rounded border border-neutral-200 bg-white p-4">
      <label className="flex flex-col gap-1 text-sm">
        Numéro (format E.164)
        <input
          required
          value={f.numero}
          placeholder="+22670000000"
          onChange={(e) => setF({ ...f, numero: e.target.value })}
          className="rounded border border-neutral-300 px-2 py-1.5"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Lien wa.me
        <input
          required
          value={f.lienWa}
          placeholder="https://wa.me/22670000000"
          onChange={(e) => setF({ ...f, lienWa: e.target.value })}
          className="rounded border border-neutral-300 px-2 py-1.5"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-40"
      >
        Enregistrer
      </button>
    </form>
  )
}
