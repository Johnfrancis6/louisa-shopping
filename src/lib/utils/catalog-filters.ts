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

// ─────────────────────────────────────────────────────────────────────────────
// Normalisation — borne les clés de cache
// ─────────────────────────────────────────────────────────────────────────────
//
// `getProducts(filters, cursor)` est `'use cache'` : ses ARGUMENTS font partie
// de la clé de cache. Les filtres arrivent de l'extérieur (query string, et
// surtout l'objet brut passé à la Server Action `loadMoreProducts`), donc sans
// normalisation n'importe qui peut créer un nombre illimité d'entrées de cache
// distinctes. On borne (longueur, cardinalité, plage) et on canonicalise
// (trim, dédoublonnage, tri) : deux requêtes équivalentes tapent la même clé.

/** Plafond de prix arbitraire mais large — 100 M FCFA. */
const MAX_PRICE = 100_000_000
const MAX_FACET_VALUES = 20
const MAX_FACET_LEN = 40
const MAX_SLUG_LEN = 80

/** Trim, dédoublonne, tronque et TRIE — l'ordre ne doit pas changer la clé. */
function normFacet(values: unknown): string[] | undefined {
  if (!Array.isArray(values)) return undefined
  const out = [
    ...new Set(
      values
        .filter((v): v is string => typeof v === 'string')
        .map((v) => v.trim().slice(0, MAX_FACET_LEN))
        .filter(Boolean),
    ),
  ]
    .sort((a, b) => a.localeCompare(b, 'fr'))
    .slice(0, MAX_FACET_VALUES)
  return out.length ? out : undefined
}

function normPrice(value: unknown): number | undefined {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return undefined
  return Math.min(Math.trunc(n), MAX_PRICE)
}

/**
 * Forme canonique et bornée d'un jeu de filtres. À appliquer à TOUTE entrée
 * externe avant qu'elle n'atteigne une fonction `'use cache'`.
 */
export function normalizeCatalogFilters(raw: CatalogFilters): CatalogFilters {
  const categorie =
    typeof raw?.categorie === 'string' && raw.categorie.trim()
      ? raw.categorie.trim().toLowerCase().slice(0, MAX_SLUG_LEN)
      : undefined

  const prixMin = normPrice(raw?.prixMin)
  const prixMax = normPrice(raw?.prixMax)

  return {
    categorie,
    // Une fourchette inversée ne filtrerait rien : on la remet à l'endroit.
    prixMin: prixMin !== undefined && prixMax !== undefined ? Math.min(prixMin, prixMax) : prixMin,
    prixMax: prixMin !== undefined && prixMax !== undefined ? Math.max(prixMin, prixMax) : prixMax,
    couleurs: normFacet(raw?.couleurs),
    tailles: normFacet(raw?.tailles),
    enStockUniquement: raw?.enStockUniquement === true,
    tri: (SORT_VALUES as string[]).includes(raw?.tri as string) && raw.tri !== 'nouveaute'
      ? raw.tri
      : undefined,
  }
}

/** Offset de pagination borné — même raison : il entre dans la clé de cache. */
export const MAX_CATALOG_OFFSET = 10_000

export function normalizeCatalogCursor(cursor: string | null): string | null {
  if (cursor === null) return null
  const n = Number(cursor)
  if (!Number.isFinite(n) || n <= 0) return null
  return String(Math.min(Math.trunc(n), MAX_CATALOG_OFFSET))
}

export function parseCatalogFilters(params: RawSearchParams): CatalogFilters {
  const prixMin = params.prixMin ? Number(params.prixMin) : undefined
  const prixMax = params.prixMax ? Number(params.prixMax) : undefined

  // Normalisé ici aussi : la query string est une entrée externe au même titre
  // que l'argument de la Server Action.
  return normalizeCatalogFilters({
    categorie: typeof params.categorie === 'string' ? params.categorie : undefined,
    prixMin: Number.isFinite(prixMin) ? prixMin : undefined,
    prixMax: Number.isFinite(prixMax) ? prixMax : undefined,
    couleurs: toArray(params.couleurs),
    tailles: toArray(params.tailles),
    enStockUniquement: params.enStock === '1',
    tri: toSort(params.tri),
  })
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