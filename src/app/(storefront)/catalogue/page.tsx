import { Suspense } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { getProducts, getCatalogFacets } from '@/lib/data/products'
import { parseCatalogFilters } from '@/lib/utils/catalog-filters'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { FiltersSheet } from '@/components/storefront/catalogue/filters-sheet'
import { ProductGrid } from '@/components/storefront/catalogue/product-grid'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default function CataloguePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  return (
    <div className="pb-8">
      <div className="flex items-center justify-between px-4 pt-6 md:px-12">
        <h1 className="text-ls-h1 text-ls-gray-900">Catalogue</h1>
        <Suspense fallback={<FiltersButtonFallback />}>
          <FiltersSheetLoader />
        </Suspense>
      </div>

      <Suspense fallback={<CatalogueResultsSkeleton />}>
        <CatalogueResults searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function FiltersSheetLoader() {
  const facets = await getCatalogFacets()
  return <FiltersSheet facets={facets} />
}

function FiltersButtonFallback() {
  return (
    <div
      className={cn(
        buttonVariants({ variant: 'outline' }),
        'h-11 gap-2 opacity-50 pointer-events-none',
      )}
    >
      <SlidersHorizontal className="h-4 w-4" />
      Filtres
    </div>
  )
}

/** Seul ce composant lit `searchParams` (dynamique) → isolé dans <Suspense>. */
async function CatalogueResults({ searchParams }: { searchParams: SearchParams }) {
  const rawParams = await searchParams
  const filters = parseCatalogFilters(rawParams)
  const { items, nextCursor } = await getProducts(filters, null)

  return (
    <div className="mt-6">
      <ProductGrid
        key={JSON.stringify(filters)}
        initialItems={items}
        initialNextCursor={nextCursor}
        filters={filters}
      />
    </div>
  )
}

function CatalogueResultsSkeleton() {
  return (
    <div className="mt-6 grid grid-cols-2 gap-4 px-4 md:grid-cols-3 md:px-12 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="ls-skeleton aspect-[3/4] rounded-ls-card" />
      ))}
    </div>
  )
}
