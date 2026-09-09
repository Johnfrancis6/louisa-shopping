import type { CatalogFilters } from '@/types/catalog'

type RawSearchParams = Record<string, string | string[] | undefined>

function toArray(value: string | string[] | undefined): string[] | undefined {
  if (!value) return undefined
  return Array.isArray(value) ? value : value.split(',')
}

export function parseCatalogFilters(params: RawSearchParams): CatalogFilters {
  const prixMin = params.prixMin ? Number(params.prixMin) : undefined
  const prixMax = params.prixMax ? Number(params.prixMax) : undefined

  return {
    categorie: typeof params.categorie === 'string' ? params.categorie : undefined,
    prixMin: Number.isFinite(prixMin) ? prixMin : undefined,
    prixMax: Number.isFinite(prixMax) ? prixMax : undefined,
    couleurs: toArray(params.couleurs),
    tailles: toArray(params.tailles),
    enStockUniquement: params.enStock === '1',
  }
}

export function catalogFiltersToSearchParams(filters: CatalogFilters): URLSearchParams {
  const params = new URLSearchParams()

  if (filters.categorie) params.set('categorie', filters.categorie)
  if (filters.prixMin !== undefined) params.set('prixMin', String(filters.prixMin))
  if (filters.prixMax !== undefined) params.set('prixMax', String(filters.prixMax))
  if (filters.couleurs?.length) params.set('couleurs', filters.couleurs.join(','))
  if (filters.tailles?.length) params.set('tailles', filters.tailles.join(','))
  if (filters.enStockUniquement) params.set('enStock', '1')

  return params
}