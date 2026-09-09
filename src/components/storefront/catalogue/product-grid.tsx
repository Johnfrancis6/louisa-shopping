'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { loadMoreProducts } from '@/lib/actions/catalog'
import { ProductCard } from './product-card'
import type { CatalogFilters, Product } from '@/types/catalog'

export function ProductGrid({
  initialItems,
  initialNextCursor,
  filters,
}: {
  initialItems: Product[]
  initialNextCursor: string | null
  filters: CatalogFilters
}) {
  const [items, setItems] = useState(initialItems)
  const [nextCursor, setNextCursor] = useState(initialNextCursor)
  const [isPending, startTransition] = useTransition()
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!nextCursor) return
    const el = sentinelRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || isPending) return
        startTransition(async () => {
          const page = await loadMoreProducts(filters, nextCursor)
          setItems((prev) => [...prev, ...page.items])
          setNextCursor(page.nextCursor)
        })
      },
      { rootMargin: '600px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [nextCursor, isPending, filters])

  if (items.length === 0) {
    return (
      <p className="px-4 py-12 text-center text-ls-body text-ls-gray-500 md:px-12">
        Aucun produit ne correspond à ces filtres.
      </p>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 px-4 md:grid-cols-3 md:px-12 lg:grid-cols-4">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {nextCursor && <div ref={sentinelRef} aria-hidden className="h-1" />}
      {isPending && (
        <p className="py-6 text-center text-ls-label text-ls-gray-500">
          Chargement…
        </p>
      )}
    </>
  )
}