/**
 * src/lib/db/schema.ts
 * Louisa Shopping — Schéma Drizzle (Postgres / Supabase)
 * Référence unique pour toute table applicative. Ne jamais dupliquer ces
 * définitions ailleurs — importer depuis ce module.
 * Aligné sur contrat-technique-v2.5 (Next.js 16, src/ acté, Zone et
 * WhatsappConfig désormais entités contractuelles à part entière).
 *
 * Convention (imposée par l'agent DB, premier agent code — voir
 * regles-coordination.md §6) :
 *  - préfixe `src/` obligatoire (acté contrat v2.5 section A)
 *  - 1 fichier = 1 domaine (ici : tout le schéma, le projet reste petit)
 *  - noms de table : snake_case singulier au niveau SQL, camelCase côté TS
 *  - clé primaire : uuid (default gen_random_uuid())
 *  - tous les montants (prix, frais) sont des entiers en FCFA (pas de
 *    décimales — le FCFA n'a pas de sous-unité courante)
 *  - `createdAt` / `updatedAt` ajoutés systématiquement même quand le
 *    contrat ne les liste pas explicitement (voir tableau "Écarts" dans
 *    db-reference.md) — additifs, sans impact sur les consommateurs existants.
 *
 * Autorisation (contrat v2.5 section C — stratégie tranchée) : PAS de pont
 * RLS auth.uid() ↔ Better Auth. L'autorisation "propriétaire" (un client ne
 * voit que ses commandes/wishlist) est portée par les Server Actions de
 * l'agent Logique métier via `dbAdmin` + vérification explicite
 * (`order.customerId === session.user.id`). RLS reste un filet deny-by-default
 * — voir supabase/policies.sql.
 *
 * Identité (décision actée par l'agent Admin, 2026-09 — src/lib/auth.ts) :
 * tables Better Auth standard (`user`/`session`/`account`/`verification`),
 * PAS de fusion avec `customer`. Un hook post-signup crée la ligne
 * `customer` avec le MÊME id que la ligne `user` — appliqué ici via une
 * vraie FK `customer.id -> user.id` (`text`, pas `uuid` : l'adapter Drizzle
 * de Better Auth génère des ids texte, pas des UUID Postgres).
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
  foreignKey,
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

// Type union dérivé de l'enum — à importer pour typer les paramètres de
// Server Actions (ex. `updateOrderStatus(id: string, status: OrderStatus)`).
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];

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
    // FK auto-référente (hiérarchie de catégories) — via foreignKey() dans le
    // callback, pas .references() sur la colonne (non supporté pour self-FK).
    parentFk: foreignKey({
      columns: [t.parentId],
      foreignColumns: [t.id],
      name: "category_parent_id_fk",
    }).onDelete("set null"),
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
// Zone — entité contractuelle depuis v2.5 (section B) : table de référence
// légère, hybride avec Product.delivery_zones (référencée de manière
// optionnelle par zone_id dans le jsonb).
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
// Better Auth — tables imposées par l'adapter Drizzle officiel (noms de
// table `user`/`session`/`account`/`verification` NON renommables : lus en
// dur par l'adapter). Ajout additif — décision actée par l'agent Admin,
// 2026-09 : PAS de fusion avec `customer` ; deux tables séparées reliées par
// un même id (hook post-signup, voir agent Auth / src/lib/auth.ts).
// Email + mot de passe, session en base (révocation immédiate côté Admin).
// ---------------------------------------------------------------------------

export const authUser = pgTable(
  "user",
  {
    id: text("id").primaryKey(), // id généré par Better Auth (pas gen_random_uuid())
    role: text("role").notNull().default("customer"), // 'customer' | 'admin'
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    // Collecté au signup via Better Auth additionalFields (obligatoire) puis
    // recopié sur customer.phone (notNull unique) par le hook post-signup.
    phone: text("phone"),
    image: text("image"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    emailUnique: uniqueIndex("user_email_unique").on(t.email),
  })
);

export const authUserRelations = relations(authUser, ({ one, many }) => ({
  sessions: many(authSession),
  accounts: many(authAccount),
  // Relation 1-1 : la ligne customer est créée par le hook post-signup avec
  // le MÊME id que authUser.id (voir FK sur customer.id ci-dessous).
  customerProfile: one(customer, {
    fields: [authUser.id],
    references: [customer.id],
  }),
}));

export const authSession = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tokenUnique: uniqueIndex("session_token_unique").on(t.token),
    userIdx: index("session_user_id_idx").on(t.userId),
  })
);

export const authSessionRelations = relations(authSession, ({ one }) => ({
  user: one(authUser, {
    fields: [authSession.userId],
    references: [authUser.id],
  }),
}));

export const authAccount = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"), // hash email/password — stocké ici, jamais sur `user`
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userIdx: index("account_user_id_idx").on(t.userId),
    // Ajout DB (non fourni par l'agent Admin) : un provider ne peut pas
    // être lié deux fois au même compte externe — requis par Better Auth.
    providerAccountUnique: uniqueIndex("account_provider_account_unique").on(
      t.providerId,
      t.accountId
    ),
  })
);

export const authAccountRelations = relations(authAccount, ({ one }) => ({
  user: one(authUser, {
    fields: [authAccount.userId],
    references: [authUser.id],
  }),
}));

export const authVerification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Customer
// ---------------------------------------------------------------------------

export const customer = pgTable(
  "customer",
  {
    // ÉCART CORRIGÉ (voir db-reference.md) : customer.id passe de uuid à
    // text, avec une vraie FK vers authUser.id — ce n'est PAS un simple
    // commentaire de convention comme dans la version précédente. La ligne
    // customer est créée par le hook post-signup (src/lib/auth.ts) avec le
    // MÊME id que la ligne user Better Auth correspondante.
    id: text("id")
      .primaryKey()
      .references(() => authUser.id, { onDelete: "cascade" }),
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

export const customerRelations = relations(customer, ({ one, many }) => ({
  authUser: one(authUser, {
    fields: [customer.id],
    references: [authUser.id],
  }),
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
    customerId: text("customer_id")
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
    /**
     * Adresse de livraison figée au moment de la commande (même logique que
     * items_snapshot : le vendeur livre contre la commande, pas contre le
     * profil client qui peut changer ensuite). Renseignée par `createOrder`.
     * Forme : { fullName, phone, city, directions? } — cf. DeliveryAddress
     * dans src/lib/actions/checkout.ts. Nullable pour les commandes créées
     * avant cette colonne.
     */
    deliveryAddress: jsonb("delivery_address"),
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
    customerId: text("customer_id")
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
    customerId: text("customer_id")
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
// WhatsappConfig — entité contractuelle depuis v2.5 (section B) : config
// GLOBALE (un seul commerçant confirmé), pas un champ par produit.
// Champs contrat v2.5 : id (singleton, CHECK id=1), numero, lien_wa.
// Pattern singleton : une seule ligne (id fixé à 1, contrainte CHECK).
// Modifiable uniquement via dbAdmin / Admin (contrat D).
// ---------------------------------------------------------------------------

export const whatsappConfig = pgTable(
  "whatsapp_config",
  {
    id: smallint("id").primaryKey().default(1),
    numero: text("numero").notNull(), // format E.164, ex. +22670000000
    // Lien wa.me pré-construit (avec ou sans template de message) — permet à
    // l'Admin de changer le format du lien sans dépendre d'une génération
    // recalculée côté code applicatif à chaque déploiement.
    lienWa: text("lien_wa").notNull(),
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

// Alias de compatibilité avec les Server Actions existantes.
export const categories = category;
export const products = product;
export const variants = variant;
export const orders = order;
export const orderItems = orderItem;
export const reviews = review;
// ---------------------------------------------------------------------------