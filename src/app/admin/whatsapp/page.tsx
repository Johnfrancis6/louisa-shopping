import { Suspense } from 'react'
import { connection } from 'next/server'
import { getWhatsappConfig } from '@/lib/db/admin'
import { WhatsappConfigForm } from '@/components/admin/whatsapp-config-form'
import { PageHeader, Panel } from '@/components/admin/ui'

export default function AdminWhatsappPage() {
  return (
    <div>
      <PageHeader
        title="Configuration WhatsApp"
        description="Numéro et lien wa.me utilisés par le bouton « Confirmer sur WhatsApp » du suivi de commande."
      />
      <Suspense
        fallback={
          <Panel className="max-w-md">
            <div className="ls-skeleton h-40 w-full rounded-ls-sm" />
          </Panel>
        }
      >
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
    <WhatsappConfigForm numero={config?.numero ?? ''} lienWa={config?.lienWa ?? ''} />
  )
}
