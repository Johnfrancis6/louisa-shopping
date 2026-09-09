import { Suspense } from 'react'
import { searchProducts } from '@/lib/data/products'
import { SearchBox } from '@/components/storefront/search/search-box'
import { ProductCard } from '@/components/storefront/catalogue/product-card'

type SearchParams = Promise<{ q?: string }>

export const metadata = { title: 'Recherche — Louisa Shopping' }

export default function RecherchePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="px-4 py-6 md:px-12">
      <div className="mx-auto max-w-xl">
        <Suspense>
          <SearchBox autoFocus />
        </Suspense>
      </div>
      <Suspense
        key="results"
        fallback={
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="ls-skeleton aspect-[3/4] rounded-ls-card" />
            ))}
          </div>
        }
      >
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function SearchResults({ searchParams }: { searchParams: SearchParams }) {
  const { q = '' } = await searchParams
  const query = q.trim()

  if (query.length < 2) {
    return (
      <p className="mt-8 text-center text-ls-body text-ls-gray-500">
        Saisissez au moins 2 caractères.
      </p>
    )
  }

  const results = await searchProducts(query)

  if (results.length === 0) {
    return (
      <p className="mt-8 text-center text-ls-body text-ls-gray-500">
        Aucun résultat pour « {query} ».
      </p>
    )
  }

  return (
    <>
      <p className="mt-6 text-ls-label text-ls-gray-500">
        {results.length} résultat{results.length > 1 ? 's' : ''}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {results.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </>
  )
}
