import { Suspense } from 'react'
import { connection } from 'next/server'
import { Star } from 'lucide-react'
import { listReviewsAdmin } from '@/lib/db/admin'
import { ReviewModeration } from '@/components/admin/review-moderation'
import { PageHeader, Card, CardList, EmptyState, LoadingRows } from '@/components/admin/ui'

export default function AdminReviewsPage() {
  return (
    <div>
      <PageHeader
        title="Avis"
        description="Un avis n'apparaît sur la boutique qu'une fois approuvé."
      />
      <Suspense fallback={<LoadingRows />}>
        <ReviewsList />
      </Suspense>
    </div>
  )
}

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-ls-warning-bg text-ls-warning',
  approved: 'bg-ls-success-bg text-ls-success',
  rejected: 'bg-ls-danger-bg text-ls-danger',
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  approved: 'Approuvé',
  rejected: 'Rejeté',
}

async function ReviewsList() {
  await connection()
  let rows: Awaited<ReturnType<typeof listReviewsAdmin>> = []
  try {
    rows = await listReviewsAdmin()
  } catch (err) {
    console.error('[admin/reviews]', err)
  }

  if (rows.length === 0) return <EmptyState>Aucun avis.</EmptyState>

  return (
    <CardList>
      {rows.map((r) => (
        <Card key={r.id}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-ls-gray-900">{r.productName ?? '—'}</p>
              <p className="text-xs text-ls-gray-500">par {r.customerName ?? '—'}</p>
            </div>
            <span className={'shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ' + (STATUS_STYLE[r.status] ?? 'bg-ls-gray-100 text-ls-gray-600')}>
              {STATUS_LABEL[r.status] ?? r.status}
            </span>
          </div>

          <div className="flex items-center gap-0.5" aria-label={`${r.rating} sur 5`}>
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                size={16}
                className={i < r.rating ? 'fill-ls-violet text-ls-violet' : 'text-ls-gray-300'}
              />
            ))}
          </div>

          {r.body && <p className="text-sm text-ls-gray-700">{r.body}</p>}

          <div className="border-t border-ls-gray-100 pt-3">
            <ReviewModeration id={r.id} status={r.status} />
          </div>
        </Card>
      ))}
    </CardList>
  )
}
