'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import type { CatalogSort } from '@/types/catalog'

const OPTIONS: { value: CatalogSort; label: string }[] = [
  { value: 'nouveaute', label: 'Nouveautés' },
  { value: 'prix-asc', label: 'Prix croissant' },
  { value: 'prix-desc', label: 'Prix décroissant' },
  { value: 'nom', label: 'Nom A–Z' },
]

/**
 * Menu de tri du catalogue — `<select>` natif stylé (robuste, accessible,
 * pas de dépendance). Écrit `?tri=` dans l'URL en préservant les autres
 * paramètres ; `nouveaute` (défaut) retire le paramètre.
 */
export function SortControl({ value }: { value: CatalogSort }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function apply(next: string) {
    const params = new URLSearchParams(searchParams)
    if (next === 'nouveaute') params.delete('tri')
    else params.set('tri', next)
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <div className="relative min-w-0 flex-1 sm:flex-none">
      <select
        value={value}
        onChange={(e) => apply(e.target.value)}
        aria-label="Trier les produits"
        className="h-11 w-full appearance-none truncate rounded-ls-sm border border-ls-gray-200 bg-ls-white pl-3 pr-9 text-ls-label font-medium text-ls-gray-900 transition-[border-color] duration-[var(--duration-ls-fast)] ease-[var(--ease-ls-out)] focus-visible:border-ls-violet focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ls-violet/50 sm:w-auto md:hover:border-ls-gray-500"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            Trier : {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ls-gray-500"
        aria-hidden
      />
    </div>
  )
}
