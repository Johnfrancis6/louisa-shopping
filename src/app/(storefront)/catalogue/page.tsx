import { Suspense } from 'react'
import { getProducts, getCatalogFacets } from '@/lib/data/products'
import { getCategories } from '@/lib/data/categories'
import { parseCatalogFilters, countActiveFilters } from '@/lib/utils/catalog-filters'
import { ProductGrid } from '@/components/storefront/catalogue/product-grid'
import { CatalogueToolbar } from '@/components/storefront/catalogue/catalogue-toolbar'
import { ActiveFilters } from '@/components/storefront/catalogue/active-filters'
import {
  CategoryGrid,
  CategoryGridSkeleton,
} from '@/components/storefront/catalogue/category-grid'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default function CataloguePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  return (
    <div className="mx-auto max-w-6xl pb-16">
      <header className="px-4 pt-8 md:px-12 md:pt-10">
        <span
          className="mb-3 block h-[3px] w-8 rounded-full bg-ls-violet"
          aria-hidden
        />
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ls-violet-dark">
          Parcourir
        </p>
        <h1 className="mt-2 text-ls-h1 text-ls-gray-900">Catalogue</h1>
        <Suspense fallback={null}>
          <CatalogueHeaderMeta searchParams={searchParams} />
        </Suspense>
      </header>

      <Suspense fallback={<CategoryGridSkeleton />}>
        <CategoryGridSection searchParams={searchParams} />
      </Suspense>

      <Suspense fallback={<CatalogueResultsSkeleton />}>
        <CatalogueResults searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

/**
 * Sous-titre contextuel : « {Catégorie} · {N} produits » quand un filtre
 * catégorie est actif. Lit `searchParams` (dynamique) → isolé sous <Suspense>.
 */
async function CatalogueHeaderMeta({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseCatalogFilters(await searchParams)
  if (!filters.categorie) return null

  const [categories, { total }] = await Promise.all([
    getCategories(),
    getProducts(filters, null),
  ])
  const category = categories.find((c) => c.slug === filters.categorie)
  if (!category) return null

  return (
    <p className="mt-1 text-ls-body text-ls-gray-600">
      {category.name} · {total} produit{total > 1 ? 's' : ''}
    </p>
  )
}

/** Grille de catégories — lit `searchParams` pour marquer la catégorie active. */
async function CategoryGridSection({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseCatalogFilters(await searchParams)
  return <CategoryGrid activeSlug={filters.categorie} />
}

/**
 * Toolbar (compteur / tri / filtres) + grille produit. Seul ce composant lit
 * `searchParams` (dynamique) → isolé dans <Suspense>. `getProducts` /
 * `getCatalogFacets` sont `'use cache'` → un seul hit DB même si l'en-tête les
 * appelle aussi.
 */
async function CatalogueResults({ searchParams }: { searchParams: SearchParams }) {
  const rawParams = await searchParams
  const filters = parseCatalogFilters(rawParams)
  const [{ items, nextCursor, total }, facets] = await Promise.all([
    getProducts(filters, null),
    getCatalogFacets(),
  ])

  return (
    <>
      <CatalogueToolbar
        total={total}
        tri={filters.tri ?? 'nouveaute'}
        activeCount={countActiveFilters(filters)}
        facets={facets}
      />
      <ActiveFilters />
      <div className="mt-6">
        <h2 className="sr-only">Produits</h2>
        <ProductGrid
          key={JSON.stringify(filters)}
          initialItems={items}
          initialNextCursor={nextCursor}
          filters={filters}
        />
      </div>
    </>
  )
}

function CatalogueResultsSkeleton() {
  return (
    <>
      <div className="mt-8 flex items-center justify-between gap-3 px-4 md:px-12">
        <div className="ls-skeleton h-11 w-40 rounded-ls-sm" />
        <div className="ls-skeleton h-11 w-24 rounded-ls-sm" />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 px-4 md:grid-cols-3 md:px-12 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="ls-skeleton aspect-[3/4] rounded-ls-md" />
        ))}
      </div>
    </>
  )
}
