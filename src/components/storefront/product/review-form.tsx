'use client'

import { useState, useTransition } from 'react'
import { Star } from 'lucide-react'
import { toast } from 'sonner'
import { createReview } from '@/lib/actions/reviews'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export function ReviewForm({ productId }: { productId: string }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!rating || comment.trim().length < 3) {
      toast.error('Choisissez une note et rédigez votre avis.')
      return
    }

    startTransition(async () => {
      const result = await createReview({ productId, rating, comment })
      if (result.success) {
        toast.success('Avis envoyé — en attente de modération avant publication.')
        setRating(0)
        setComment('')
      } else {
        toast.error(result.error ?? "Échec de l'envoi.")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 border-t border-ls-gray-200 pt-6">
      <p className="text-ls-body font-medium text-ls-gray-900">Laisser un avis</p>

      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, i) => {
          const value = i + 1
          return (
            <button
              key={value}
              type="button"
              aria-label={`${value} étoile${value > 1 ? 's' : ''}`}
              aria-pressed={value <= rating}
              onClick={() => setRating(value)}
              className="flex h-11 w-11 items-center justify-center"
            >
              <Star
                className={
                  'h-5 w-5 ' +
                  (value <= rating
                    ? 'fill-ls-violet text-ls-violet'
                    : 'fill-none text-ls-gray-300')
                }
              />
            </button>
          )
        })}
      </div>

      <Textarea
        placeholder="Votre avis"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        required
        maxLength={2000}
      />

      <Button type="submit" disabled={isPending} className="h-11 w-fit bg-ls-violet hover:bg-ls-violet-dark">
        Envoyer
      </Button>
    </form>
  )
}
