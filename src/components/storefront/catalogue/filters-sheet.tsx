// src/components/storefront/catalogue/filters-sheet.tsx
'use client'

import { Suspense, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { SlidersHorizontal } from 'lucide-react'
import { Sheet, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Slider } from '@/components/ui/slider'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/utils/format'
import { catalogFiltersToSearchParams, parseCatalogFilters } from '@/lib/utils/catalog-filters'
import type { CatalogFacets } from '@/lib/data/products'

/** Palier du slider prix, arrondi au millier le plus proche. */
function priceStep(max: number): number {
  if (max <= 0) return 1000
  const raw = Math.max(1000, Math.round(max / 20 / 1000) * 1000)
  return raw
}

function FiltersSheetInner({ facets }: { facets: CatalogFacets }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const priceMin = 0
  const priceMax = facets.priceMax > 0 ? facets.priceMax : 200_000
  const step = priceStep(priceMax)

  const current = parseCatalogFilters(Object.fromEntries(searchParams.entries()))

  const [prix, setPrix] = useState<[number, number]>([
    current.prixMin ?? priceMin,
    current.prixMax ?? priceMax,
  ])
  const [couleurs, setCouleurs] = useState<string[]>(current.couleurs ?? [])
  const [tailles, setTailles] = useState<string[]>(current.tailles ?? [])
  const [enStock, setEnStock] = useState(Boolean(current.enStockUniquement))

  function apply() {
    const params = catalogFiltersToSearchParams({
      categorie: current.categorie,
      prixMin: prix[0] > priceMin ? prix[0] : undefined,
      prixMax: prix[1] < priceMax ? prix[1] : undefined,
      couleurs,
      tailles,
      enStockUniquement: enStock,
    })
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <Sheet>
      <SheetTrigger className={cn(buttonVariants({ variant: 'outline' }), 'h-11 gap-2')}>
        <SlidersHorizontal className="h-4 w-4" />
        Filtres
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Filtres</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-6 overflow-y-auto px-4 py-2">
          <div>
            <p className="mb-3 text-ls-body font-medium text-ls-gray-900">Prix</p>
            <Slider
              min={priceMin}
              max={priceMax}
              step={step}
              value={prix}
              onValueChange={(v) => setPrix(v as [number, number])}
            />
            <p className="mt-2 text-ls-label text-ls-gray-500">
              {formatPrice(prix[0])} – {formatPrice(prix[1])}
            </p>
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
          <SheetClose onClick={apply} className={cn(buttonVariants(), 'h-11 w-full bg-ls-accent text-ls-white hover:bg-ls-accent-dark')}>
            Voir les résultats
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function FiltersSheet({ facets }: { facets: CatalogFacets }) {
  return (
    <Suspense fallback={
      <div className={cn(buttonVariants({ variant: 'outline' }), 'h-11 gap-2 opacity-50 pointer-events-none')}>
        <SlidersHorizontal className="h-4 w-4" />
        Filtres
      </div>
    }>
      <FiltersSheetInner facets={facets} />
    </Suspense>
  )
}
