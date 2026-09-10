'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { X } from 'lucide-react'
import { parseCatalogFilters } from '@/lib/utils/catalog-filters'
import { formatPrice } from '@/lib/utils/format'

const FILTER_PARAMS = ['prixMin', 'prixMax', 'couleurs', 'tailles', 'enStock'] as const

/**
 * Chips de filtres actifs sous la toolbar. Chaque chip retire son groupe et
 * navigue (params préservés). « Tout effacer » vide prix/couleur/taille/stock
 * mais garde `categorie` (navigation contextuelle) et `tri`.
 * Rendu `null` si aucun filtre → aucun impact de mise en page.
 */
export function ActiveFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const filters = parseCatalogFilters(Object.fromEntries(searchParams.entries()))

  function push(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams)
    mutate(params)
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  const chips: { key: string; label: string; remove: () => void }[] = []

  if (filters.prixMin !== undefined || filters.prixMax !== undefined) {
    const label =
      filters.prixMin !== undefined && filters.prixMax !== undefined
        ? `${formatPrice(filters.prixMin)} – ${formatPrice(filters.prixMax)}`
        : filters.prixMax !== undefined
          ? `Jusqu’à ${formatPrice(filters.prixMax)}`
          : `À partir de ${formatPrice(filters.prixMin as number)}`
    chips.push({
      key: 'prix',
      label,
      remove: () => push((p) => { p.delete('prixMin'); p.delete('prixMax') }),
    })
  }

  for (const couleur of filters.couleurs ?? []) {
    chips.push({
      key: `couleur-${couleur}`,
      label: couleur,
      remove: () =>
        push((p) => {
          const rest = (filters.couleurs ?? []).filter((c) => c !== couleur)
          if (rest.length) p.set('couleurs', rest.join(','))
          else p.delete('couleurs')
        }),
    })
  }

  for (const taille of filters.tailles ?? []) {
    chips.push({
      key: `taille-${taille}`,
      label: `Taille ${taille}`,
      remove: () =>
        push((p) => {
          const rest = (filters.tailles ?? []).filter((t) => t !== taille)
          if (rest.length) p.set('tailles', rest.join(','))
          else p.delete('tailles')
        }),
    })
  }

  if (filters.enStockUniquement) {
    chips.push({
      key: 'stock',
      label: 'En stock',
      remove: () => push((p) => p.delete('enStock')),
    })
  }

  if (chips.length === 0) return null

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 px-4 md:px-12">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.remove}
          aria-label={`Retirer le filtre : ${chip.label}`}
          className="group inline-flex h-9 items-center gap-1.5 rounded-full border border-ls-gray-200 bg-ls-white pl-3 pr-2 text-ls-label font-medium text-ls-gray-700 transition-[border-color] duration-[var(--duration-ls-fast)] ease-[var(--ease-ls-out)] md:hover:border-ls-gray-500"
        >
          {chip.label}
          <X
            className="size-3.5 text-ls-gray-400 transition-colors duration-[var(--duration-ls-fast)] group-hover:text-ls-gray-700"
            aria-hidden
          />
        </button>
      ))}
      <button
        type="button"
        onClick={() => push((p) => FILTER_PARAMS.forEach((k) => p.delete(k)))}
        className="inline-flex h-9 items-center rounded-full px-3 text-ls-label font-semibold text-ls-violet-dark transition-colors duration-[var(--duration-ls-fast)] md:hover:text-ls-violet"
      >
        Tout effacer
      </button>
    </div>
  )
}
