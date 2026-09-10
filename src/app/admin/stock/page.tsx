import { Suspense } from 'react'
import { connection } from 'next/server'
import { listStockOverview } from '@/lib/db/admin'
import { StockAdjust } from '@/components/admin/stock-adjust'
import { PageHeader, Card, CardList, EmptyState, LoadingRows } from '@/components/admin/ui'

export default function AdminStockPage() {
  return (
    <div>
      <PageHeader
        title="Stock"
        description="Chaque ajustement est tracé dans le StockLedger. Delta négatif = sortie, positif = entrée."
      />
      <Suspense fallback={<LoadingRows />}>
        <StockList />
      </Suspense>
    </div>
  )
}

async function StockList() {
  await connection()
  let rows: Awaited<ReturnType<typeof listStockOverview>> = []
  try {
    rows = await listStockOverview()
  } catch (err) {
    console.error('[admin/stock]', err)
  }

  if (rows.length === 0) return <EmptyState>Aucune variante.</EmptyState>

  return (
    <CardList cols={2}>
      {rows.map((r) => {
        const variant = [r.size, r.color].filter(Boolean).join(' / ')
        const low = r.stockQty === 0
        return (
          <Card key={r.variantId} className="gap-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-ls-gray-900">{r.productName ?? '—'}</p>
                <p className="text-xs text-ls-gray-500">
                  {r.sku}
                  {variant ? ` · ${variant}` : ''}
                </p>
              </div>
              <span
                className={
                  'shrink-0 rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums ' +
                  (low ? 'bg-ls-danger-bg text-ls-danger' : 'bg-ls-gray-100 text-ls-gray-800')
                }
              >
                {r.stockQty}
              </span>
            </div>
            <StockAdjust variantId={r.variantId} stockQty={r.stockQty} />
          </Card>
        )
      })}
    </CardList>
  )
}
