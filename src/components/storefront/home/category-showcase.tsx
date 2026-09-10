import Link from 'next/link'
import Image from 'next/image'
import { ShoppingBag } from 'lucide-react'
import { getCategories, getCategoryProductCounts } from '@/lib/data/categories'
import { SectionHeader } from './home-sections'

/**
 * Section « boutique » de la home — grande image par catégorie, empilées.
 * Chaque bloc (image + libellé + affordance) est UN lien vers la catégorie.
 * Copie d'accroche = brouillon pour visualiser la cohérence (à valider).
 * Le `bg_color` par catégorie n'est plus peint (fond blanc uniforme).
 *
 * Lecture DB cachée (`getCategories` / `getCategoryProductCounts`).
 */

/** Accroches par slug (brouillon). Fallback générique si le slug est inconnu. */
const TAGLINES: Record<string, string> = {
  electromenager: 'Équipez votre maison sans exploser le budget.',
  'sacs-a-main': "L'accessoire qui change toute une tenue.",
  'fitness-velos-de-sport': 'Gardez la forme, à la maison, à votre rythme.',
  'vetements-homme': 'Le vestiaire essentiel, taille après taille.',
  'vetements-femme': 'Des pièces simples qui vous ressemblent.',
  etageres: 'Rangez, exposez, gagnez de la place.',
  'sacs-isothermes': 'Vos courses au frais, du marché jusqu’à la maison.',
  'tenues-fillettes': 'Des tenues qui suivent toutes leurs journées.',
  plats: 'Recevez avec de la belle vaisselle.',
  climatiseurs: 'Gardez la fraîcheur, saison après saison.',
}

function taglineFor(slug: string, name: string): string {
  return TAGLINES[slug] ?? `Découvrez notre sélection ${name.toLowerCase()}.`
}

export async function CategoryShowcase() {
  const [categories, counts] = await Promise.all([
    getCategories(),
    getCategoryProductCounts(),
  ])
  if (categories.length === 0) return null

  return (
    <section id="nos-boutiques" className="bg-ls-white px-4 py-14 sm:px-6 md:px-12 md:py-16">
      <div className="mx-auto max-w-[640px]">
        <SectionHeader
          eyebrow="Nos boutiques"
          heading="La boutique, catégorie par catégorie."
        />
      </div>

      <div className="mx-auto mt-10 flex max-w-[640px] flex-col gap-10">
        {categories.map((category) => {
          const n = counts[category.id] ?? 0
          const countLabel =
            n > 0 ? `${n} article${n > 1 ? 's' : ''}` : null
          return (
            <Link
              key={category.id}
              href={`/catalogue?categorie=${category.slug}`}
              aria-label={
                countLabel
                  ? `${category.name} — ${countLabel}`
                  : `${category.name} — voir le catalogue`
              }
              className="ls-reveal group flex flex-col gap-3 focus-visible:outline-none"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ls-violet-dark">
                {taglineFor(category.slug, category.name)}
              </p>

              <div className="relative aspect-[3/2] overflow-hidden rounded-ls-xl bg-ls-gray-100 shadow-ls-showcase transition-shadow group-focus-visible:ring-2 group-focus-visible:ring-ls-violet group-focus-visible:ring-offset-2">
                {category.image_url ? (
                  <Image
                    src={category.image_url}
                    alt=""
                    fill
                    sizes="(min-width: 640px) 640px, 100vw"
                    className="object-cover transition-transform duration-[var(--duration-ls-base)] ease-[var(--ease-ls-out)] md:group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-ls-gray-300">
                    <ShoppingBag className="h-12 w-12" strokeWidth={1.4} aria-hidden />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
                <h3 className="absolute bottom-4 right-4 rounded-full bg-ls-white/95 px-4 py-1.5 text-[15px] font-semibold text-ls-violet-dark shadow-ls-card">
                  {category.name}
                </h3>
              </div>

              <span className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-ls-violet-tint bg-ls-violet-bg text-ls-body font-medium text-ls-violet-dark transition-colors duration-[var(--duration-ls-fast)] group-hover:bg-ls-violet-tint">
                Voir le catalogue
                {countLabel && (
                  <span className="text-ls-label font-normal text-ls-violet-dark/70">
                    · {countLabel}
                  </span>
                )}
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

export function CategoryShowcaseSkeleton() {
  return (
    <section className="bg-ls-white px-4 py-14 sm:px-6 md:px-12 md:py-16">
      <div className="mx-auto max-w-[640px]">
        <div className="ls-skeleton h-[3px] w-8 rounded-full" />
        <div className="ls-skeleton mt-3 h-3 w-24 rounded-ls-xs" />
        <div className="ls-skeleton mt-2 h-7 w-3/4 rounded-ls-xs" />
      </div>

      <div className="mx-auto mt-10 flex max-w-[640px] flex-col gap-10">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <div className="ls-skeleton h-3 w-2/3 rounded-ls-xs" />
            <div className="ls-skeleton aspect-[3/2] rounded-ls-xl" />
            <div className="ls-skeleton h-12 w-full rounded-full" />
          </div>
        ))}
      </div>
    </section>
  )
}
