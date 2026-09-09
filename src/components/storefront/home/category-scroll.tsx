import { connection } from 'next/server'
import { getCategories } from '@/lib/data/categories'
import { CategoryCard } from './category-card'

/**
 * Scroll horizontal des catégories (visible === true, tri position puis nom).
 * Lecture DB cachée (`getCategories`, tag `categories`). `connection()` diffère
 * le rendu à la requête — le composant est un trou dynamique PPR, jamais
 * pré-rendu au build. À placer sous <Suspense> par le parent.
 * Scroll manuel uniquement (pas d'autoplay).
 */
export async function CategoryScroll() {
  await connection()
  const categories = await getCategories()

  if (categories.length === 0) return null

  return (
    <section aria-label="Catégories" className="px-4">
      <div className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 scrollbar-hide lg:overflow-hidden">
        {categories.map((category) => (
          <div
            key={category.id}
            className="h-[160px] w-[120px] flex-shrink-0 md:h-[180px] md:w-[140px] lg:h-[200px] lg:w-[160px]"
          >
            <CategoryCard category={category} />
          </div>
        ))}
      </div>
    </section>
  )
}

export function CategoryScrollSkeleton() {
  return (
    <section aria-label="Catégories" className="px-4">
      <div className="flex gap-3 overflow-x-auto pb-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="ls-skeleton h-[160px] w-[120px] flex-shrink-0 rounded-[--radius-ls-card] md:h-[180px] md:w-[140px] lg:h-[200px] lg:w-[160px]"
          />
        ))}
      </div>
    </section>
  )
}
