import { cacheLife, cacheTag } from 'next/cache'
import { and, asc, desc, eq, ilike, inArray, or } from 'drizzle-orm'
import { dbAnon } from '@/lib/db/client'
import {
  products,
  variants,
  media,
  category,
  tutorialContent,
} from '@/lib/db/schema'
import type {
  CatalogFilters,
  Product,
  ProductDetail,
  ProductVariant,
  DeliveryZone,
} from '@/types/catalog'

const PAGE_SIZE = 12

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de mapping DB -> types storefront
// ─────────────────────────────────────────────────────────────────────────────

type VariantRow = {
  id: string
  productId: string
  sku: string
  size: string | null
  color: string | null
  stockQty: number
  priceOverride: number | null
}

function toVariant(v: VariantRow, basePrice: number, imageUrl: string | null): ProductVariant {
  return {
    id: v.id,
    productId: v.productId,
    sku: v.sku,
    size: v.size,
    color: v.color,
    unitPrice: v.priceOverride ?? basePrice,
    stock_qty: v.stockQty,
    imageUrl,
  }
}

/** Prix d'appel d'un produit = plus petit prix variante. */
function minPriceOf(product: Product): number {
  return Math.min(...product.variants.map((v) => v.unitPrice))
}

/**
 * Tri en mémoire de la liste déjà filtrée. `nouveaute` (défaut) conserve
 * l'ordre SQL (createdAt desc). Tri stable : `sort` de V8 l'est.
 */
function sortProducts(list: Product[], tri: CatalogFilters['tri']): Product[] {
  switch (tri) {
    case 'prix-asc':
      return [...list].sort((a, b) => minPriceOf(a) - minPriceOf(b))
    case 'prix-desc':
      return [...list].sort((a, b) => minPriceOf(b) - minPriceOf(a))
    case 'nom':
      return [...list].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
    default:
      return list
  }
}

function matchesFilters(product: Product, filters: CatalogFilters): boolean {
  return product.variants.some((variant) => {
    if (filters.prixMin !== undefined && variant.unitPrice < filters.prixMin) return false
    if (filters.prixMax !== undefined && variant.unitPrice > filters.prixMax) return false
    if (filters.couleurs?.length && !filters.couleurs.includes(variant.color ?? '')) return false
    if (filters.tailles?.length && !filters.tailles.includes(variant.size ?? '')) return false
    if (filters.enStockUniquement && variant.stock_qty <= 0) return false
    return true
  })
}

type ProductHead = {
  id: string
  slug: string
  name: string
  categoryId: string
  basePrice: number
  hasTutorial: boolean
}

/** Charge variantes + première image pour une liste de produits déjà filtrée. */
async function hydrate(heads: ProductHead[]): Promise<Product[]> {
  if (heads.length === 0) return []
  const ids = heads.map((p) => p.id)

  const [variantRows, imageRows] = await Promise.all([
    dbAnon
      .select({
        id: variants.id,
        productId: variants.productId,
        sku: variants.sku,
        size: variants.size,
        color: variants.color,
        stockQty: variants.stockQty,
        priceOverride: variants.priceOverride,
      })
      .from(variants)
      .where(inArray(variants.productId, ids)),
    dbAnon
      .select({ productId: media.productId, url: media.url })
      .from(media)
      .where(and(inArray(media.productId, ids), eq(media.type, 'image')))
      .orderBy(asc(media.position)),
  ])

  const firstImage = new Map<string, string>()
  for (const img of imageRows) {
    if (!firstImage.has(img.productId)) firstImage.set(img.productId, img.url)
  }
  const byProduct = new Map<string, VariantRow[]>()
  for (const v of variantRows) {
    const list = byProduct.get(v.productId) ?? []
    list.push(v)
    byProduct.set(v.productId, list)
  }

  return heads
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      categoryId: p.categoryId,
      isActive: true,
      hasTutorial: p.hasTutorial,
      variants: (byProduct.get(p.id) ?? []).map((v) =>
        toVariant(v, p.basePrice, firstImage.get(p.id) ?? null),
      ),
    }))
    .filter((p) => p.variants.length > 0)
}

// ─────────────────────────────────────────────────────────────────────────────
// Recherche
// ─────────────────────────────────────────────────────────────────────────────

export async function searchProducts(query: string): Promise<Product[]> {
  'use cache'
  cacheLife('minutes')
  cacheTag('products', 'stock')

  const q = query.trim()
  if (q.length < 2) return []
  // `%` et `_` sont des jokers LIKE : échappés (ESCAPE '\\' est le défaut PG)
  // pour qu'une saisie utilisateur reste une recherche littérale.
  const pattern = `%${q.replace(/[\\%_]/g, '\\$&')}%`

  try {
    // Match sur le nom du produit OU le SKU d'une de ses variantes.
    const productIdsBySku = dbAnon
      .select({ id: variants.productId })
      .from(variants)
      .where(ilike(variants.sku, pattern))

    const heads = await dbAnon
      .select({
        id: products.id,
        slug: products.slug,
        name: products.name,
        categoryId: products.categoryId,
        basePrice: products.basePrice,
        hasTutorial: products.hasTutorial,
      })
      .from(products)
      .where(
        and(
          eq(products.isActive, true),
          or(ilike(products.name, pattern), inArray(products.id, productIdsBySku)),
        ),
      )
      .orderBy(desc(products.createdAt))
      .limit(40)

    return hydrate(heads)
  } catch (err) {
    console.error('[data/products] searchProducts', err)
    return []
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Catalogue (liste paginée)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Liste paginée du catalogue. Filtrage variante (prix/couleur/taille/stock)
 * fait en mémoire après lecture — le catalogue est petit (dizaines de
 * produits) et la lisibilité prime sur une requête SQL complexe.
 *
 * `filters.categorie` = SLUG de catégorie (pas l'id) — cf. parseCatalogFilters.
 */
export async function getProducts(
  filters: CatalogFilters,
  cursor: string | null,
): Promise<{ items: Product[]; nextCursor: string | null; total: number }> {
  'use cache'
  cacheLife('minutes')
  cacheTag('products', 'stock')

  try {
    const heads = await dbAnon
      .select({
        id: products.id,
        slug: products.slug,
        name: products.name,
        categoryId: products.categoryId,
        basePrice: products.basePrice,
        hasTutorial: products.hasTutorial,
      })
      .from(products)
      .innerJoin(category, eq(products.categoryId, category.id))
      .where(
        and(
          eq(products.isActive, true),
          eq(category.visible, true),
          filters.categorie ? eq(category.slug, filters.categorie) : undefined,
        ),
      )
      .orderBy(desc(products.createdAt))

    const filtered = (await hydrate(heads)).filter((p) => matchesFilters(p, filters))
    const all = sortProducts(filtered, filters.tri)

    const start = cursor ? Math.max(0, Number(cursor) || 0) : 0
    const items = all.slice(start, start + PAGE_SIZE)
    const nextIndex = start + items.length
    return {
      items,
      nextCursor: nextIndex < all.length ? String(nextIndex) : null,
      total: all.length,
    }
  } catch (err) {
    console.error('[data/products] getProducts', err)
    return { items: [], nextCursor: null, total: 0 }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fiche produit
// ─────────────────────────────────────────────────────────────────────────────

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  'use cache'
  cacheLife('minutes')
  cacheTag('products', 'stock', `product:${slug}`)

  try {
    const [product] = await dbAnon
      .select({
        id: products.id,
        slug: products.slug,
        name: products.name,
        categoryId: products.categoryId,
        description: products.description,
        basePrice: products.basePrice,
        hasTutorial: products.hasTutorial,
        deliveryZones: products.deliveryZones,
      })
      .from(products)
      .where(and(eq(products.slug, slug), eq(products.isActive, true)))
      .limit(1)

    if (!product) return null

    const [variantRows, imageRows, tutoRows] = await Promise.all([
      dbAnon
        .select({
          id: variants.id,
          productId: variants.productId,
          sku: variants.sku,
          size: variants.size,
          color: variants.color,
          stockQty: variants.stockQty,
          priceOverride: variants.priceOverride,
        })
        .from(variants)
        .where(eq(variants.productId, product.id)),
      dbAnon
        .select({ url: media.url })
        .from(media)
        .where(and(eq(media.productId, product.id), eq(media.type, 'image')))
        .orderBy(asc(media.position)),
      dbAnon
        .select({ url: tutorialContent.url })
        .from(tutorialContent)
        .where(eq(tutorialContent.productId, product.id))
        .limit(1),
    ])

    const images = imageRows.map((i) => i.url)
    const firstImage = images[0] ?? null

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      categoryId: product.categoryId,
      isActive: true,
      hasTutorial: product.hasTutorial,
      description: product.description ?? '',
      images,
      deliveryZones: (product.deliveryZones as DeliveryZone[]) ?? [],
      tutorialUrl: product.hasTutorial ? tutoRows[0]?.url ?? null : null,
      variants: variantRows.map((v) => toVariant(v, product.basePrice, firstImage)),
    }
  } catch (err) {
    console.error('[data/products] getProductBySlug', err)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Facettes de filtrage (couleurs / tailles / fourchette de prix disponibles)
// ─────────────────────────────────────────────────────────────────────────────

export type CatalogFacets = {
  colors: string[]
  sizes: string[]
  priceMin: number
  priceMax: number
}

const DEFAULT_FACETS: CatalogFacets = { colors: [], sizes: [], priceMin: 0, priceMax: 0 }

export async function getCatalogFacets(): Promise<CatalogFacets> {
  'use cache'
  cacheLife('hours')
  cacheTag('products')

  try {
    const rows = await dbAnon
      .select({
        color: variants.color,
        size: variants.size,
        priceOverride: variants.priceOverride,
        basePrice: products.basePrice,
      })
      .from(variants)
      .innerJoin(products, eq(variants.productId, products.id))
      .where(eq(products.isActive, true))

    if (rows.length === 0) return DEFAULT_FACETS

    const colors = new Set<string>()
    const sizes = new Set<string>()
    let min = Infinity
    let max = 0
    for (const r of rows) {
      if (r.color) colors.add(r.color)
      if (r.size) sizes.add(r.size)
      const price = r.priceOverride ?? r.basePrice
      if (price < min) min = price
      if (price > max) max = price
    }

    return {
      colors: [...colors].sort((a, b) => a.localeCompare(b, 'fr')),
      sizes: [...sizes].sort((a, b) => a.localeCompare(b, 'fr')),
      priceMin: Number.isFinite(min) ? min : 0,
      priceMax: max,
    }
  } catch (err) {
    console.error('[data/products] getCatalogFacets', err)
    return DEFAULT_FACETS
  }
}
