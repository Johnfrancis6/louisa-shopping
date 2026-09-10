/**
 * Type provisoire — reconstruit à partir des indications du brief (champs réels :
 * image_url, slug, parent_id, bg_color). À remplacer par le type exact dès que
 * `07-agent-db/db-reference` est disponible.
 */
export type Category = {
  id: string
  slug: string
  name: string
  bg_color: string
  image_url: string | null
  position: number
  visible: boolean
  parent_id: string | null
}
 
export type ProductVariant = {
  id: string
  productId: string
  sku: string
  size: string | null
  color: string | null
  unitPrice: number
  stock_qty: number
  imageUrl: string | null
}

export type DeliveryZone = {
  zone_id?: string
  zone_label: string
  frais: number
  delai_jours_min: number
  delai_jours_max: number
}

export type Product = {
  id: string
  slug: string
  name: string
  categoryId: string
  isActive: boolean
  hasTutorial: boolean
  variants: ProductVariant[]
}

export type ProductDetail = Product & {
  description: string
  images: string[]
  deliveryZones: DeliveryZone[]
  tutorialUrl: string | null
}

/** Ordre d'affichage du catalogue. `nouveaute` = défaut (createdAt desc). */
export type CatalogSort = 'nouveaute' | 'prix-asc' | 'prix-desc' | 'nom'

export type CatalogFilters = {
  categorie?: string
  prixMin?: number
  prixMax?: number
  couleurs?: string[]
  tailles?: string[]
  enStockUniquement?: boolean
  tri?: CatalogSort
}

export type Review = {
  id: string
  productId: string
  author: string
  rating: 1 | 2 | 3 | 4 | 5
  comment: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}