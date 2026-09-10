import { Suspense } from 'react'
import { connection } from 'next/server'
import { getWhatsappConfig } from '@/lib/db/admin'
import { WhatsappConfigForm } from '@/components/admin/whatsapp-config-form'

export default function AdminWhatsappPage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Configuration WhatsApp</h1>
      <p className="mb-4 max-w-md text-sm text-ls-gray-500">
        Numéro et lien utilisés pour le bouton de commande. Le lien wa.me est
        pré-construit — il est utilisé tel quel côté site.
      </p>
      <Suspense fallback={<p className="text-sm text-ls-gray-500">Chargement…</p>}>
        <ConfigLoader />
      </Suspense>
    </div>
  )
}

async function ConfigLoader() {
  await connection()
  let config: Awaited<ReturnType<typeof getWhatsappConfig>> | null = null
  try {
    config = await getWhatsappConfig()
  } catch (err) {
    console.error('[admin/whatsapp]', err)
  }

  return (
    <WhatsappConfigForm
      numero={config?.numero ?? ''}
      lienWa={config?.lienWa ?? ''}
    />
  )
}
