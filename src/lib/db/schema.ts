/**
 * lib/db/schema.ts
 * Louisa Shopping — Schéma Drizzle (Postgres / Supabase)
 * Référence unique pour toute table applicative. Ne jamais dupliquer ces
 * définitions ailleurs — importer depuis ce module.
 *
 * Convention (imposée par l'agent DB, premier agent code — voir
 * regles-coordination.md §6) :
 *  - 1 fichier = 1 domaine (ici : tout le schéma, le projet reste petit)
 *  - noms de table : snake_case singulier au niveau SQL, camelCase côté TS
 *  - clé primaire : uuid (default gen_random_uuid())
 *  - tous les montants (prix, frais) sont des entiers en FCFA (pas de
 *    décimales — le FCFA n'a pas de sous-unité courante)
 *  - `createdAt` / `updatedAt` ajoutés systématiquement même quand le
 *    contrat ne les liste pas explicitement (voir tableau "Écarts" dans la
 *    réponse) — additifs, sans impact sur les consommateurs existants.
 */

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  smallint,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** Diagramme d'états — contrat v2.3 section F */
export const orderStatusEnum = pgEnum("order_status", [
  "pending_whatsapp",
  "confirmed",
  "processing",
  "cancelled",
  "shipped",
  "delivered",
]);

/** Vitrine uniquement — aucune transaction réelle ne transite par ces valeurs */
export const paymentMethodEnum = pgEnum("payment_method", [
  "mobile_money_orange",
  "mobile_money_moov",
  "cod",
]);

export const mediaTypeEnum = pgEnum("media_type", ["image", "video"]);

export const tutorialTypeEnum = pgEnum("tutorial_type", [
  "video",
  "pdf",
  "article",
]);

/** `order` = décrément vente, `cancellation`/`return` = recrédit, `manual_adjustment` = admin */
export const stockReasonEnum = pgEnum("stock_reason", [
  "order",
  "cancellation",
  "return",
  "manual_adjustment",
]);

export const reviewStatusEnum = pgEnum("review_status", [
  "pending",
  "approved",
  "rejected",
]);

// ---------------------------------------------------------------------------
// Category — self-join, extensible (pas de limite figée)
// ---------------------------------------------------------------------------

export const category = pgTable(
  "category",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    parentId: uuid("parent_id"),
    imageUrl: text("image_url"),
    bgColor: text("bg_color").notNull(), // hex — validé côté Admin (contrat C, WCAG AA)
    position: integer("position").notNull().default(0),
    visible: boolean("visible").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    slugUnique: uniqueIndex("category_slug_unique").on(t.slug),
    parentIdx: index("category_parent_id_idx").on(t.parentId),
    // self-FK ajoutée en migration SQL brute (Drizzle pg-core ne supporte pas
    // proprement une FK vers la même table dans le constructeur de colonne)
  })
);

export const categoryRelations = relations(category, ({ one, many }) => ({
  parent: one(category, {
    fields: [category.parentId],
    references: [category.id],
    relationName: "category_parent",
  }),
  children: many(category, { relationName: "category_parent" }),
  products: many(product),
}));

// ---------------------------------------------------------------------------
// Zones — table de référence légère (hybride avec Product.delivery_zones)
// ---------------------------------------------------------------------------

export const zone = pgTable("zone", {
  id: uuid("id").primaryKey().defaultRandom(),
  nom: text("nom").notNull(),
  fraisBase: integer("frais_base").notNull(), // FCFA — valeur de référence, surchargeable par produit
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------

export const product = pgTable(
  "product",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => category.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    description: text("description"),
    basePrice: integer("base_price").notNull(), // FCFA
    hasTutorial: boolean("has_tutorial").notNull().default(false),
    hasPdf: boolean("has_pdf").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    /**
     * Livraison — brief §"Points spécifiques" :
     * jsonb définie à l'ajout du produit, zones desservies avec frais/délai.
     * Hybride : chaque entrée PEUT référencer zone.id (métadonnées partagées)
     * ou rester autonome (zone_id = null) pour un frais ad hoc.
     * Structure d'une entrée :
     * {
     *   "zone_id": "uuid" | null,
     *   "zone_label": "Ouagadougou" ,     // requis si zone_id null
     *   "frais": 1500,                     // FCFA, surcharge zone.frais_base
     *   "delai_jours_min": 1,
     *   "delai_jours_max": 2
     * }
     */
    deliveryZones: jsonb("delivery_zones").notNull().default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    slugUnique: uniqueIndex("product_slug_unique").on(t.slug),
    categoryIdx: index("product_category_id_idx").on(t.categoryId),
    activeIdx: index("product_is_active_idx").on(t.isActive),
  })
);

export const productRelations = relations(product, ({ one, many }) => ({
  category: one(category, {
    fields: [product.categoryId],
    references: [category.id],
  }),
  variants: many(variant),
  media: many(media),
  tutorialContents: many(tutorialContent),
  reviews: many(review),
}));

// ---------------------------------------------------------------------------
// Variant
// ---------------------------------------------------------------------------

export const variant = pgTable(
  "variant",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    size: text("size"),
    color: text("color"),
    sku: text("sku").notNull(),
    stockQty: integer("stock_qty").notNull().default(0),
    priceOverride: integer("price_override"), // FCFA, null = utiliser product.base_price
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    skuUnique: uniqueIndex("variant_sku_unique").on(t.sku),
    productIdx: index("variant_product_id_idx").on(t.productId),
    stockNonNegative: check("variant_stock_qty_check", sql`${t.stockQty} >= 0`),
  })
);

export const variantRelations = relations(variant, ({ one, many }) => ({
  product: one(product, {
    fields: [variant.productId],
    references: [product.id],
  }),
  orderItems: many(orderItem),
  stockLedgerEntries: many(stockLedger),
  wishlistEntries: many(wishlist),
}));

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    type: mediaTypeEnum("type").notNull(),
    position: integer("position").notNull().default(0),
    alt: text("alt"),
  },
  (t) => ({
    productIdx: index("media_product_id_idx").on(t.productId),
  })
);

export const mediaRelations = relations(media, ({ one }) => ({
  product: one(product, {
    fields: [media.productId],
    references: [product.id],
  }),
}));

// ---------------------------------------------------------------------------
// TutorialContent — affiché si product.has_tutorial = true
// ---------------------------------------------------------------------------

export const tutorialContent = pgTable(
  "tutorial_content",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    type: tutorialTypeEnum("type").notNull(),
    url: text("url").notNull(),
    label: text("label").notNull(),
  },
  (t) => ({
    productIdx: index("tutorial_content_product_id_idx").on(t.productId),
  })
);

export const tutorialContentRelations = relations(
  tutorialContent,
  ({ one }) => ({
    product: one(product, {
      fields: [tutorialContent.productId],
      references: [product.id],
    }),
  })
);

// ---------------------------------------------------------------------------
// Customer
// ---------------------------------------------------------------------------

export const customer = pgTable(
  "customer",
  {
    // Hypothèse (à confirmer par l'agent Auth) : customer.id = id utilisateur
    // Better Auth, pour que auth.uid() (Supabase) matche directement la ligne
    // customer côté RLS sans table de mapping supplémentaire.
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    addressJson: jsonb("address_json"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    phoneUnique: uniqueIndex("customer_phone_unique").on(t.phone),
  })
);

export const customerRelations = relations(customer, ({ many }) => ({
  orders: many(order),
  wishlistEntries: many(wishlist),
  reviews: many(review),
}));

// ---------------------------------------------------------------------------
// Order
// ---------------------------------------------------------------------------

export const order = pgTable(
  "order",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "restrict" }),
    status: orderStatusEnum("status").notNull().default("pending_whatsapp"),
    paymentMethod: paymentMethodEnum("payment_method").notNull(),
    total: integer("total").notNull(), // FCFA
    /**
     * jsonb figé au moment de la commande — structure imposée par le
     * contrat v2.3 section B (bloc items_snapshot). Un item :
     * { variant_id, sku, product_name, size, color, unit_price_at_order,
     *   qty, image_url, has_tutorial }
     */
    itemsSnapshot: jsonb("items_snapshot").notNull(),
    // Renseigné par l'admin à la validation (confirmed) — cf. contrat B
    whatsappRef: text("whatsapp_ref"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    customerIdx: index("order_customer_id_idx").on(t.customerId),
    statusIdx: index("order_status_idx").on(t.status),
  })
);

export const orderRelations = relations(order, ({ one, many }) => ({
  customer: one(customer, {
    fields: [order.customerId],
    references: [customer.id],
  }),
  items: many(orderItem),
  stockLedgerEntries: many(stockLedger),
}));

// ---------------------------------------------------------------------------
// OrderItem
// ---------------------------------------------------------------------------

export const orderItem = pgTable(
  "order_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => variant.id, { onDelete: "restrict" }),
    qty: integer("qty").notNull(),
    unitPrice: integer("unit_price").notNull(), // FCFA, figé au moment de l'achat
  },
  (t) => ({
    orderIdx: index("order_item_order_id_idx").on(t.orderId),
    variantIdx: index("order_item_variant_id_idx").on(t.variantId),
    qtyPositive: check("order_item_qty_check", sql`${t.qty} > 0`),
  })
);

export const orderItemRelations = relations(orderItem, ({ one }) => ({
  order: one(order, {
    fields: [orderItem.orderId],
    references: [order.id],
  }),
  variant: one(variant, {
    fields: [orderItem.variantId],
    references: [variant.id],
  }),
}));

// ---------------------------------------------------------------------------
// StockLedger — seule source de vérité pour les mouvements de stock
// (contrat C : décrémenté uniquement à confirmed -> processing)
// ---------------------------------------------------------------------------

export const stockLedger = pgTable(
  "stock_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => variant.id, { onDelete: "restrict" }),
    delta: integer("delta").notNull(), // négatif = décrément, positif = recrédit
    reason: stockReasonEnum("reason").notNull(),
    orderId: uuid("order_id").references(() => order.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    variantIdx: index("stock_ledger_variant_id_idx").on(t.variantId),
    orderIdx: index("stock_ledger_order_id_idx").on(t.orderId),
  })
);

export const stockLedgerRelations = relations(stockLedger, ({ one }) => ({
  variant: one(variant, {
    fields: [stockLedger.variantId],
    references: [variant.id],
  }),
  order: one(order, {
    fields: [stockLedger.orderId],
    references: [order.id],
  }),
}));

// ---------------------------------------------------------------------------
// Review
// ---------------------------------------------------------------------------

export const review = pgTable(
  "review",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    body: text("body"),
    status: reviewStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    productIdx: index("review_product_id_idx").on(t.productId),
    customerIdx: index("review_customer_id_idx").on(t.customerId),
    ratingRange: check(
      "review_rating_check",
      sql`${t.rating} >= 1 AND ${t.rating} <= 5`
    ),
  })
);

export const reviewRelations = relations(review, ({ one }) => ({
  product: one(product, {
    fields: [review.productId],
    references: [product.id],
  }),
  customer: one(customer, {
    fields: [review.customerId],
    references: [customer.id],
  }),
}));

// ---------------------------------------------------------------------------
// Wishlist
// ---------------------------------------------------------------------------

export const wishlist = pgTable(
  "wishlist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => variant.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uniqueEntry: uniqueIndex("wishlist_customer_product_variant_unique").on(
      t.customerId,
      t.productId,
      t.variantId
    ),
    customerIdx: index("wishlist_customer_id_idx").on(t.customerId),
  })
);

export const wishlistRelations = relations(wishlist, ({ one }) => ({
  customer: one(customer, {
    fields: [wishlist.customerId],
    references: [customer.id],
  }),
  product: one(product, {
    fields: [wishlist.productId],
    references: [product.id],
  }),
  variant: one(variant, {
    fields: [wishlist.variantId],
    references: [variant.id],
  }),
}));

// ---------------------------------------------------------------------------
// WhatsappConfig — brief : "correction du rapport Stack précédent" — un seul
// commerçant confirmé => configuration GLOBALE (pas un champ par produit).
// Pattern singleton : une seule ligne (id fixé à 1, contrainte CHECK).
// Absent du contrat B — ajout signalé, voir "Écart détecté".
// ---------------------------------------------------------------------------

export const whatsappConfig = pgTable(
  "whatsapp_config",
  {
    id: smallint("id").primaryKey().default(1),
    phoneNumber: text("phone_number").notNull(), // format E.164, ex. +22670000000
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    singleton: check("whatsapp_config_singleton", sql`${t.id} = 1`),
  })
);

// ---------------------------------------------------------------------------
// TrafficContext — PAS de table.
// Contrat B : "Redis TTL 30 min, cookie traffic-ctx". Hors périmètre DB
// (relationnel) volontairement — ne pas créer de table ici. Si une
// persistance long terme est requise un jour, elle devra être actée dans
// 01-architecture/ avant implémentation (règle de conflit §8).
// ---------------------------------------------------------------------------