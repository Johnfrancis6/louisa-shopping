import Link from 'next/link'
import { Star } from 'lucide-react'
import { getApprovedReviews } from '@/lib/data/reviews'
import { getUserId } from '@/lib/auth-guards'
import { ReviewForm } from './review-form'

export async function ReviewsSection({ productId }: { productId: string }) {
  const [reviews, userId] = await Promise.all([
    getApprovedReviews(productId),
    getUserId(),
  ])

  return (
    <section className="border-t border-ls-gray-200 px-4 py-6 md:px-12">
      <h2 className="text-ls-h2 text-ls-gray-900">Avis clients</h2>

      {reviews.length === 0 ? (
        <p className="mt-3 text-ls-body text-ls-gray-500">
          Aucun avis pour l&apos;instant — soyez le premier à en laisser un.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {reviews.map((review) => (
            <li key={review.id} className="border-b border-ls-gray-200 pb-4 last:border-0">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    className={
                      'h-4 w-4 ' +
                      (i < review.rating
                        ? 'fill-ls-violet text-ls-violet'
                        : 'fill-none text-ls-gray-300')
                    }
                  />
                ))}
              </div>
              <p className="mt-2 text-ls-body text-ls-gray-900">{review.comment}</p>
              <p className="mt-1 text-ls-label text-ls-gray-500">
                {review.author} ·{' '}
                {new Date(review.createdAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </li>
          ))}
        </ul>
      )}

      {userId ? (
        <ReviewForm productId={productId} />
      ) : (
        <p className="mt-6 border-t border-ls-gray-200 pt-6 text-ls-body text-ls-gray-500">
          <Link href="/connexion" className="text-ls-gray-900 underline hover:text-ls-gray-600">
            Connectez-vous
          </Link>{' '}
          pour laisser un avis.
        </p>
      )}
    </section>
  )
}
