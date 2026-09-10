import type { CatalogFilters, CatalogSort } from '@/types/catalog'

type RawSearchParams = Record<string, string | string[] | undefined>

const SORT_VALUES: CatalogSort[] = ['nouveaute', 'prix-asc', 'prix-desc', 'nom']

function toSort(value: string | string[] | undefined): CatalogSort | undefined {
  const v = Array.isArray(value) ? value[0] : value
  return v && (SORT_VALUES as string[]).includes(v) && v !== 'nouveaute'
    ? (v as CatalogSort)
    : undefined
}

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
    tri: toSort(params.tri),
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
  if (filters.tri && filters.tri !== 'nouveaute') params.set('tri', filters.tri)

  return params
}

/**
 * Nombre de groupes de filtres actifs — pour la pastille du bouton « Filtres »
 * et les chips. La catégorie n'est PAS comptée (portée par le sous-titre et la
 * tuile active). Le tri non plus (contrôle distinct).
 */
export function countActiveFilters(filters: CatalogFilters): number {
  let n = 0
  if (filters.prixMin !== undefined || filters.prixMax !== undefined) n++
  if (filters.couleurs?.length) n++
  if (filters.tailles?.length) n++
  if (filters.enStockUniquement) n++
  return n
}