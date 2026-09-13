import { Suspense } from 'react'
import { connection } from 'next/server'
import { listHomeBlocksAdmin } from '@/lib/db/admin'
import {
  HomeBlockCreateForm,
  HomeBlockCard,
  SLOT_META,
  type HomeBlockRow,
} from '@/components/admin/home-admin'
import { PageHeader, Panel, CardList, EmptyState, LoadingRows } from '@/components/admin/ui'
import type { HomeSlot } from '@/lib/actions/admin/home'

const SLOTS: HomeSlot[] = ['hero', 'rail', 'news', 'process']

export default function AdminHomePage() {
  return (
    <div>
      <PageHeader
        title="Page d'accueil"
        description="Images, textes et liens de la home. Tant qu'une section n'a aucun bloc visible, le site affiche son contenu de repli."
      />
      <Suspense fallback={<LoadingRows />}>
        <HomeBlocks />
      </Suspense>
    </div>
  )
}

async function HomeBlocks() {
  await connection()

  let rows: Awaited<ReturnType<typeof listHomeBlocksAdmin>> = []
  try {
    rows = await listHomeBlocksAdmin()
  } catch (err) {
    console.error('[admin/home]', err)
  }

  return (
    <div className="flex flex-col gap-8">
      {SLOTS.map((slot) => {
        const meta = SLOT_META[slot]
        const blocks = rows.filter((r) => r.slot === slot) as HomeBlockRow[]

        return (
          <section key={slot} className="flex flex-col gap-4">
            <div>
              <h2 className="text-base font-semibold text-ls-gray-900">{meta.label}</h2>
              <p className="mt-1 max-w-prose text-sm text-ls-gray-500">{meta.hint}</p>
            </div>

            <Panel>
              <p className="mb-3 text-sm font-semibold text-ls-gray-900">Nouveau bloc</p>
              <HomeBlockCreateForm slot={slot} />
            </Panel>

            {blocks.length === 0 ? (
              <EmptyState>Aucun bloc — le site affiche le contenu de repli.</EmptyState>
            ) : (
              <CardList cols={2}>
                {blocks.map((block) => (
                  <HomeBlockCard key={block.id} row={block} />
                ))}
              </CardList>
            )}
          </section>
        )
      })}
    </div>
  )
}
