import { Suspense } from 'react'
import { connection } from 'next/server'
import { listReviewsAdmin } from '@/lib/db/admin'
import { ReviewModeration } from '@/components/admin/review-moderation'

export default function AdminReviewsPage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Avis</h1>
      <Suspense fallback={<p className="text-sm text-ls-gray-500">Chargement…</p>}>
        <ReviewsTable />
      </Suspense>
    </div>
  )
}

async function ReviewsTable() {
  await connection()
  let rows: Awaited<ReturnType<typeof listReviewsAdmin>> = []
  try {
    rows = await listReviewsAdmin()
  } catch (err) {
    console.error('[admin/reviews]', err)
  }

  return (
    <div className="overflow-x-auto rounded border border-ls-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-ls-gray-200 bg-ls-gray-50 text-left text-xs uppercase text-ls-gray-500">
          <tr>
            <th className="px-3 py-2">Produit</th>
            <th className="px-3 py-2">Client</th>
            <th className="px-3 py-2">Note</th>
            <th className="px-3 py-2">Avis</th>
            <th className="px-3 py-2">Statut / action</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="px-3 py-8 text-center text-ls-gray-400">
                Aucun avis.
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-ls-gray-100 align-top last:border-0">
              <td className="px-3 py-2">{r.productName ?? '—'}</td>
              <td className="px-3 py-2 text-ls-gray-500">{r.customerName ?? '—'}</td>
              <td className="px-3 py-2">{r.rating}/5</td>
              <td className="max-w-xs px-3 py-2 text-ls-gray-600">{r.body}</td>
              <td className="px-3 py-2">
                <ReviewModeration id={r.id} status={r.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
