'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateWhatsappConfig } from '@/lib/actions/admin/whatsapp-config'
import { Panel, fieldInput, btnPrimary } from './ui'

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
    <Panel className="max-w-md">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-ls-gray-500">
          Numéro (format E.164)
          <input
            required
            value={f.numero}
            placeholder="+22670000000"
            onChange={(e) => setF({ ...f, numero: e.target.value })}
            className={fieldInput}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-ls-gray-500">
          Lien wa.me
          <input
            required
            value={f.lienWa}
            placeholder="https://wa.me/22670000000"
            onChange={(e) => setF({ ...f, lienWa: e.target.value })}
            className={fieldInput}
          />
        </label>
        <button type="submit" disabled={pending} className={btnPrimary + ' w-full sm:w-auto'}>
          Enregistrer
        </button>
      </form>
    </Panel>
  )
}
