/**
 * src/lib/db/admin.ts
 * Requêtes de LECTURE pour les vues Admin — jointures/agrégats uniquement.
 * Toute écriture passe par src/lib/actions/admin/*.ts, jamais ici.
 * Toujours dbAdmin (bypass RLS) — jamais dbAnon (règle contrat D).
 */

import { dbAdmin } from "./client";
import {
  category,
  product,
  variant,
  media,
  stockLedger,
  order,
  customer,
  whatsappConfig,
  review,
} from "./schema";
import { and, asc, desc, eq } from "drizzle-orm";

// --- Catégories --------------------------------------------------------
export async function listCategoriesAdmin() {
  return dbAdmin.select().from(category).orderBy(category.position);
}

// --- Catalogue -----------------------------------------------------------
export async function listProductsAdmin() {
  return dbAdmin
    .select({
      id: product.id,
      slug: product.slug,
      name: product.name,
      basePrice: product.basePrice,
      isActive: product.isActive,
      hasTutorial: product.hasTutorial,
      categoryName: category.name,
    })
    .from(product)
    .leftJoin(category, eq(product.categoryId, category.id))
    .orderBy(desc(product.createdAt));
}

/** Fiche produit pour /admin/products/[id] — infos de base, null si absent. */
export async function getProductAdmin(id: string) {
  const [row] = await dbAdmin
    .select({
      id: product.id,
      slug: product.slug,
      name: product.name,
      basePrice: product.basePrice,
      isActive: product.isActive,
      categoryName: category.name,
    })
    .from(product)
    .leftJoin(category, eq(product.categoryId, category.id))
    .where(eq(product.id, id))
    .limit(1);
  return row ?? null;
}

/** Images d'un produit, triées par position (0 = principale). */
export async function listProductMedia(productId: string) {
  return dbAdmin
    .select({
      id: media.id,
      url: media.url,
      alt: media.alt,
      position: media.position,
    })
    .from(media)
    .where(and(eq(media.productId, productId), eq(media.type, "image")))
    .orderBy(asc(media.position));
}

// --- Stock -----------------------------------------------------------------
export async function listStockOverview() {
  return dbAdmin
    .select({
      variantId: variant.id,
      sku: variant.sku,
      productName: product.name,
      size: variant.size,
      color: variant.color,
      stockQty: variant.stockQty,
    })
    .from(variant)
    .leftJoin(product, eq(variant.productId, product.id))
    .orderBy(product.name);
}

export async function getStockLedgerForVariant(variantId: string) {
  return dbAdmin
    .select()
    .from(stockLedger)
    .where(eq(stockLedger.variantId, variantId))
    .orderBy(desc(stockLedger.createdAt));
}

// --- Commandes ---------------------------------------------------------
export async function listOrdersAdmin() {
  return dbAdmin
    .select({
      id: order.id,
      status: order.status,
      total: order.total,
      paymentMethod: order.paymentMethod,
      whatsappRef: order.whatsappRef,
      createdAt: order.createdAt,
      customerName: customer.name,
      customerPhone: customer.phone,
      itemsSnapshot: order.itemsSnapshot,
      deliveryAddress: order.deliveryAddress,
    })
    .from(order)
    .leftJoin(customer, eq(order.customerId, customer.id))
    .orderBy(desc(order.createdAt));
}

// --- Avis (modération) -------------------------------------------------
export async function listReviewsAdmin(status?: "pending" | "approved" | "rejected") {
  return dbAdmin
    .select({
      id: review.id,
      productId: review.productId,
      productName: product.name,
      customerName: customer.name,
      rating: review.rating,
      body: review.body,
      status: review.status,
      createdAt: review.createdAt,
    })
    .from(review)
    .leftJoin(product, eq(review.productId, product.id))
    .leftJoin(customer, eq(review.customerId, customer.id))
    .where(status ? eq(review.status, status) : undefined)
    .orderBy(desc(review.createdAt));
}

// --- WhatsApp config (singleton) ----------------------------------------
export async function getWhatsappConfig() {
  const rows = await dbAdmin
    .select()
    .from(whatsappConfig)
    .where(eq(whatsappConfig.id, 1));
  return rows[0] ?? null;
}
