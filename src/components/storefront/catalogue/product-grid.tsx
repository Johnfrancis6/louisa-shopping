'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { PackageOpen } from 'lucide-react'
import { loadMoreProducts } from '@/lib/actions/catalog'
import {
  catalogFiltersToSearchParams,
  countActiveFilters,
} from '@/lib/utils/catalog-filters'
import { ProductCard } from './product-card'
import type { CatalogFilters, Product } from '@/types/catalog'

/** URL du catalogue débarrassée des filtres, `categorie` et `tri` conservés. */
function resetFiltersHref(filters: CatalogFilters): string {
  const query = catalogFiltersToSearchParams({
    categorie: filters.categorie,
    tri: filters.tri,
  }).toString()
  return query ? `/catalogue?${query}` : '/catalogue'
}

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
  const [failed, setFailed] = useState(false)
  const [isPending, startTransition] = useTransition()
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Verrou en ref, pas en state : l'observateur peut refranchir la sentinelle
  // avant que `isPending` n'ait été recalculé, et la même page serait alors
  // ajoutée deux fois (clés React dupliquées).
  const loadingRef = useRef(false)

  const loadMore = useCallback(() => {
    if (loadingRef.current || !nextCursor) return
    loadingRef.current = true
    setFailed(false)
    startTransition(async () => {
      try {
        const page = await loadMoreProducts(filters, nextCursor)
        setItems((prev) => [...prev, ...page.items])
        setNextCursor(page.nextCursor)
      } catch {
        // On ne casse pas la page pour une page suivante : le bouton reste là
        // et propose de réessayer.
        setFailed(true)
      } finally {
        loadingRef.current = false
      }
    })
  }, [filters, nextCursor])

  useEffect(() => {
    if (!nextCursor) return
    const el = sentinelRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore()
      },
      { rootMargin: '600px' },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [nextCursor, loadMore])

  if (items.length === 0) {
    const hasFilters = countActiveFilters(filters) > 0
    return (
      <div className="px-4 md:px-12">
        <div className="flex flex-col items-center gap-3 rounded-ls-md border border-ls-gray-200 bg-ls-white px-6 py-12 text-center">
          <PackageOpen size={28} strokeWidth={2} className="text-ls-gray-900" aria-hidden />
          <p className="text-ls-body text-ls-gray-600">
            {hasFilters
              ? 'Aucun produit ne correspond à ces filtres.'
              : 'Cette catégorie ne contient encore aucun produit.'}
          </p>
          {hasFilters && (
            <Link
              href={resetFiltersHref(filters)}
              className="mt-1 inline-flex h-11 items-center justify-center rounded-full bg-ls-violet px-6 text-ls-body font-medium text-ls-white transition-colors duration-[var(--duration-ls-fast)] hover:bg-ls-violet-dark"
            >
              Réinitialiser les filtres
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 px-4 md:grid-cols-3 md:px-12 lg:grid-cols-4">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {nextCursor && (
        <div className="mt-8 flex flex-col items-center px-4 md:px-12">
          {/* L'observateur charge la suite avant qu'on arrive au bouton ; le
              bouton reste le chemin accessible (clavier, lecteur d'écran) et le
              filet quand l'observateur ne se déclenche pas. */}
          <div ref={sentinelRef} aria-hidden className="h-1 w-full" />
          <button
            type="button"
            onClick={loadMore}
            disabled={isPending}
            className="inline-flex h-11 items-center justify-center rounded-full border border-ls-gray-200 bg-ls-white px-6 text-ls-label font-semibold text-ls-gray-900 transition-[border-color,opacity] duration-[var(--duration-ls-fast)] disabled:opacity-50 md:hover:border-ls-gray-500"
          >
            {isPending
              ? 'Chargement…'
              : failed
                ? 'Réessayer'
                : 'Charger plus de produits'}
          </button>
          {failed && (
            <p className="mt-2 text-ls-label text-ls-gray-500">
              Le chargement a échoué.
            </p>
          )}
        </div>
      )}

      {/* Région d'annonce : sans elle, les produits ajoutés au défilement
          n'existent pas pour un lecteur d'écran. */}
      <p role="status" aria-live="polite" className="sr-only">
        {isPending
          ? 'Chargement de produits supplémentaires…'
          : `${items.length} produit${items.length > 1 ? 's' : ''} affiché${items.length > 1 ? 's' : ''}.`}
      </p>
    </>
  )
}
