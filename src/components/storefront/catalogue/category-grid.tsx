import Link from 'next/link'
import Image from 'next/image'
import { getCategories, getCategoryProductCounts } from '@/lib/data/categories'
import { cn } from '@/lib/utils'

/**
 * Grille de découverte des catégories, en tête de /catalogue.
 * Boxes bordées, coins md (pas de pilule), fond blanc uniforme — le
 * `bg_color` par catégorie n'est plus peint (audit design 2026-09).
 *
 * Lecture DB cachée (`getCategories`, `'use cache'`, tag `categories`).
 * Rendu statique : la catégorie active vient d'un prop, pas de la requête.
 * À placer sous <Suspense> par le parent (qui lit searchParams).
 */
export async function CategoryGrid({ activeSlug }: { activeSlug?: string }) {
  const [categories, counts] = await Promise.all([
    getCategories(),
    getCategoryProductCounts(),
  ])
  if (categories.length === 0) return null

  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <nav aria-label="Catégories" className="px-4 pt-6 md:px-12">
      <h2 className="mb-3 text-ls-label text-ls-gray-500">Catégories</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        <CategoryTile href="/catalogue" label="Tout" count={total} active={!activeSlug} />
        {categories.map((category) => (
          <CategoryTile
            key={category.id}
            href={`/catalogue?categorie=${category.slug}`}
            label={category.name}
            count={counts[category.id] ?? 0}
            imageUrl={category.image_url}
            active={activeSlug === category.slug}
          />
        ))}
      </div>
    </nav>
  )
}

function CategoryTile({
  href,
  label,
  count,
  imageUrl,
  active,
}: {
  href: string
  label: string
  count: number
  imageUrl?: string | null
  active: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'ls-reveal flex flex-col gap-2 rounded-ls-md border p-3 transition-[border-color,background-color,box-shadow] duration-[var(--duration-ls-fast)] ease-[var(--ease-ls-out)]',
        active
          ? 'border-ls-violet bg-ls-violet-bg'
          : 'border-ls-gray-200 bg-ls-white md:hover:border-ls-violet-tint md:hover:shadow-ls-card',
      )}
    >
      <div className="relative aspect-square overflow-hidden rounded-ls-sm bg-ls-gray-50">
        {imageUrl ? (
          <div className="absolute inset-3">
            <Image
              src={imageUrl}
              alt=""
              fill
              sizes="(min-width: 1024px) 160px, (min-width: 768px) 20vw, 40vw"
              className="object-contain"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-ls-gray-300">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden
            >
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </div>
        )}
      </div>
      <span className="text-ls-body font-medium leading-tight text-ls-gray-900">
        {label}
      </span>
      {count > 0 && (
        <span className="-mt-1 text-ls-label text-ls-gray-500">
          {count} article{count > 1 ? 's' : ''}
        </span>
      )}
    </Link>
  )
}

export function CategoryGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 px-4 pt-6 sm:grid-cols-3 md:grid-cols-4 md:px-12 lg:grid-cols-6">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="rounded-ls-md border border-ls-gray-200 p-3">
          <div className="ls-skeleton aspect-square rounded-ls-sm" />
          <div className="ls-skeleton mt-2 h-4 w-2/3 rounded-ls-xs" />
          <div className="ls-skeleton mt-1.5 h-3 w-1/3 rounded-ls-xs" />
        </div>
      ))}
    </div>
  )
}
