import { Suspense } from 'react'
import { connection } from 'next/server'
import { listStockOverview } from '@/lib/db/admin'
import { StockAdjust } from '@/components/admin/stock-adjust'

export default function AdminStockPage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Stock</h1>
      <p className="mb-4 text-sm text-neutral-500">
        L&apos;ajustement passe par le StockLedger (traçabilité). Delta négatif =
        sortie, positif = entrée.
      </p>
      <Suspense fallback={<p className="text-sm text-neutral-500">Chargement…</p>}>
        <StockTable />
      </Suspense>
    </div>
  )
}

async function StockTable() {
  await connection()
  let rows: Awaited<ReturnType<typeof listStockOverview>> = []
  try {
    rows = await listStockOverview()
  } catch (err) {
    console.error('[admin/stock]', err)
  }

  return (
    <div className="overflow-x-auto rounded border border-neutral-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs uppercase text-neutral-500">
          <tr>
            <th className="px-3 py-2">Produit</th>
            <th className="px-3 py-2">Variante</th>
            <th className="px-3 py-2">SKU</th>
            <th className="px-3 py-2">Stock / ajustement</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="px-3 py-8 text-center text-neutral-400">
                Aucune variante.
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.variantId} className="border-b border-neutral-100 last:border-0">
              <td className="px-3 py-2">{r.productName ?? '—'}</td>
              <td className="px-3 py-2 text-neutral-500">
                {[r.size, r.color].filter(Boolean).join(' / ') || '—'}
              </td>
              <td className="px-3 py-2 text-neutral-500">{r.sku}</td>
              <td className="px-3 py-2">
                <StockAdjust variantId={r.variantId} stockQty={r.stockQty} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
