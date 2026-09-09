// src/components/storefront/category-card.tsx
import Image from 'next/image'
import Link from 'next/link'
import type { Category } from '../../../types/catalog'
import { getTextColorOnBg } from '@/lib/utils/color'

/**
 * Le loader Cloudinary est configuré globalement (next.config.ts
 * images.loaderFile) — pas de prop `loader={...}` par image (frontière RSC).
 *
 * Tailles responsives (120×160 / 140×180 / 160×200) gérées par le parent
 * <CategoryScroll> via className — ce composant reste agnostique de la
 * taille pour rester réutilisable.
 */
export function CategoryCard({ category }: { category: Category }) {
  const textColor = getTextColorOnBg(category.bg_color)
  const resolvedColor = textColor === '#FFFFFF' ? '#FFFFFF' : 'var(--color-ls-gray-900)'

  return (
    <Link
      href={`/catalogue?categorie=${category.slug}`}
      className="relative block h-full w-full flex-shrink-0 snap-start overflow-hidden rounded-[--radius-ls-card] transition-shadow duration-[--duration-ls-fast] ease-[--ease-ls-out] hover:shadow-ls-card-hover"
      style={{ backgroundColor: category.bg_color }}
    >
      {category.image_url && (
        <Image
          src={category.image_url}
          alt={category.name}
          fill
          sizes="(min-width: 1024px) 160px, (min-width: 768px) 140px, 120px"
          className="object-cover"
          loading="lazy"
        />
      )}
      <div className="absolute inset-x-0 bottom-0 p-2">
        <span
          className="text-[13px] font-medium leading-tight"
          style={{ color: resolvedColor }}
        >
          {category.name}
        </span>
      </div>
    </Link>
  )
}