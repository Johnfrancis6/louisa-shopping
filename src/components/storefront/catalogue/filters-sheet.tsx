// src/components/storefront/catalogue/filters-sheet.tsx
'use client'

import { Suspense, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { catalogFiltersToSearchParams, parseCatalogFilters } from '@/lib/utils/catalog-filters'
import type { CatalogFacets } from '@/lib/data/products'

/** Tranches de prix prédéfinies (FCFA). `all` = pas de filtre prix. */
const PRICE_BRACKETS: {
  id: string
  label: string
  min: number | undefined
  max: number | undefined
}[] = [
  { id: 'all', label: 'Tous les prix', min: undefined, max: undefined },
  { id: 'lt-10k', label: 'Moins de 10 000 F', min: undefined, max: 9_999 },
  { id: '10k-25k', label: '10 000 – 25 000 F', min: 10_000, max: 25_000 },
  { id: '25k-50k', label: '25 000 – 50 000 F', min: 25_000, max: 50_000 },
  { id: '50k-100k', label: '50 000 – 100 000 F', min: 50_000, max: 100_000 },
  { id: 'gt-100k', label: 'Plus de 100 000 F', min: 100_000, max: undefined },
]

/** Retrouve la tranche correspondant aux bornes courantes de l'URL. */
function bracketFor(min: number | undefined, max: number | undefined): string {
  return PRICE_BRACKETS.find((b) => b.min === min && b.max === max)?.id ?? 'all'
}

function FiltersTriggerLabel({ activeCount }: { activeCount: number }) {
  return (
    <>
      <SlidersHorizontal className="h-4 w-4" />
      Filtres
      {activeCount > 0 && (
        <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-ls-violet px-1 text-[11px] font-semibold text-ls-white">
          {activeCount}
        </span>
      )}
    </>
  )
}

function FiltersSheetInner({
  facets,
  activeCount,
}: {
  facets: CatalogFacets
  activeCount: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const current = parseCatalogFilters(Object.fromEntries(searchParams.entries()))

  const [bracket, setBracket] = useState(bracketFor(current.prixMin, current.prixMax))
  const [couleurs, setCouleurs] = useState<string[]>(current.couleurs ?? [])
  const [tailles, setTailles] = useState<string[]>(current.tailles ?? [])
  const [enStock, setEnStock] = useState(Boolean(current.enStockUniquement))

  function apply() {
    const b = PRICE_BRACKETS.find((x) => x.id === bracket) ?? PRICE_BRACKETS[0]
    const params = catalogFiltersToSearchParams({
      categorie: current.categorie,
      tri: current.tri,
      prixMin: b.min,
      prixMax: b.max,
      couleurs,
      tailles,
      enStockUniquement: enStock,
    })
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  function reset() {
    setBracket('all')
    setCouleurs([])
    setTailles([])
    setEnStock(false)
  }

  return (
    <Sheet>
      <SheetTrigger className={cn(buttonVariants({ variant: 'outline' }), 'h-11 gap-2')}>
        <FiltersTriggerLabel activeCount={activeCount} />
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Filtres</SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-2">
          <div>
            <label
              htmlFor="filtre-prix"
              className="mb-2 block text-ls-body font-medium text-ls-gray-900"
            >
              Prix
            </label>
            <div className="relative">
              <select
                id="filtre-prix"
                value={bracket}
                onChange={(e) => setBracket(e.target.value)}
                className="h-11 w-full appearance-none rounded-ls-sm border border-ls-gray-200 bg-ls-white pl-3 pr-9 text-ls-body text-ls-gray-900 focus-visible:border-ls-violet focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ls-violet/50"
              >
                {PRICE_BRACKETS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ls-gray-500"
                aria-hidden
              />
            </div>
          </div>

          {facets.colors.length > 0 && (
            <div>
              <p className="mb-3 text-ls-body font-medium text-ls-gray-900">Couleur</p>
              <ToggleGroup multiple value={couleurs} onValueChange={setCouleurs} className="flex-wrap justify-start gap-2">
                {facets.colors.map((c) => (
                  <ToggleGroupItem key={c} value={c} className="h-11 px-4">{c}</ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          )}

          {facets.sizes.length > 0 && (
            <div>
              <p className="mb-3 text-ls-body font-medium text-ls-gray-900">Taille</p>
              <ToggleGroup multiple value={tailles} onValueChange={setTailles} className="flex-wrap justify-start gap-2">
                {facets.sizes.map((t) => (
                  <ToggleGroupItem key={t} value={t} className="h-11 min-w-11 px-3">{t}</ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          )}

          <Toggle pressed={enStock} onPressedChange={setEnStock} className="h-11 justify-start gap-2">
            Disponible en stock uniquement
          </Toggle>
        </div>
        <SheetFooter>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={reset}
              className={cn(buttonVariants({ variant: 'ghost' }), 'h-11')}
            >
              Réinitialiser
            </button>
            <SheetClose
              onClick={apply}
              className={cn(buttonVariants(), 'h-11 flex-1 bg-ls-violet text-ls-white hover:bg-ls-violet-dark')}
            >
              Voir les résultats
            </SheetClose>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function FiltersSheet({
  facets,
  activeCount = 0,
}: {
  facets: CatalogFacets
  activeCount?: number
}) {
  return (
    <Suspense fallback={
      <div className={cn(buttonVariants({ variant: 'outline' }), 'h-11 gap-2 opacity-50 pointer-events-none')}>
        <FiltersTriggerLabel activeCount={activeCount} />
      </div>
    }>
      <FiltersSheetInner facets={facets} activeCount={activeCount} />
    </Suspense>
  )
}
