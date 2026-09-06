-- 0000_init.sql
-- Louisa Shopping — migration initiale
-- Écrite à la main pour revue (pas d'accès réseau/CI dans cet environnement
-- pour exécuter `drizzle-kit generate`). À REGÉNÉRER via
-- `npx drizzle-kit generate` en CI DevOps dès que le repo est initialisé,
-- pour obtenir le fichier + meta/_journal.json officiels ; ce fichier sert
-- de référence fonctionnelle en attendant.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type "order_status" as enum (
  'pending_whatsapp', 'confirmed', 'processing', 'cancelled', 'shipped', 'delivered'
);

create type "payment_method" as enum (
  'mobile_money_orange', 'mobile_money_moov', 'cod'
);

create type "media_type" as enum ('image', 'video');

create type "tutorial_type" as enum ('video', 'pdf', 'article');

create type "stock_reason" as enum (
  'order', 'cancellation', 'return', 'manual_adjustment'
);

create type "review_status" as enum ('pending', 'approved', 'rejected');

-- ---------------------------------------------------------------------------
-- Category (self-join)
-- ---------------------------------------------------------------------------
create table "category" (
  "id" uuid primary key default gen_random_uuid(),
  "slug" text not null,
  "name" text not null,
  "parent_id" uuid references "category"("id") on delete set null,
  "image_url" text,
  "bg_color" text not null,
  "position" integer not null default 0,
  "visible" boolean not null default true,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);
create unique index "category_slug_unique" on "category"("slug");
create index "category_parent_id_idx" on "category"("parent_id");

-- ---------------------------------------------------------------------------
-- Zone (hybride avec product.delivery_zones)
-- ---------------------------------------------------------------------------
create table "zone" (
  "id" uuid primary key default gen_random_uuid(),
  "nom" text not null,
  "frais_base" integer not null,
  "created_at" timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Product
-- ---------------------------------------------------------------------------
create table "product" (
  "id" uuid primary key default gen_random_uuid(),
  "slug" text not null,
  "category_id" uuid not null references "category"("id") on delete restrict,
  "name" text not null,
  "description" text,
  "base_price" integer not null,
  "has_tutorial" boolean not null default false,
  "has_pdf" boolean not null default false,
  "is_active" boolean not null default true,
  "delivery_zones" jsonb not null default '[]'::jsonb,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);
create unique index "product_slug_unique" on "product"("slug");
create index "product_category_id_idx" on "product"("category_id");
create index "product_is_active_idx" on "product"("is_active");

-- ---------------------------------------------------------------------------
-- Variant
-- ---------------------------------------------------------------------------
create table "variant" (
  "id" uuid primary key default gen_random_uuid(),
  "product_id" uuid not null references "product"("id") on delete cascade,
  "size" text,
  "color" text,
  "sku" text not null,
  "stock_qty" integer not null default 0,
  "price_override" integer,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  constraint "variant_stock_qty_check" check ("stock_qty" >= 0)
);
create unique index "variant_sku_unique" on "variant"("sku");
create index "variant_product_id_idx" on "variant"("product_id");

-- ---------------------------------------------------------------------------
-- Media
-- ---------------------------------------------------------------------------
create table "media" (
  "id" uuid primary key default gen_random_uuid(),
  "product_id" uuid not null references "product"("id") on delete cascade,
  "url" text not null,
  "type" "media_type" not null,
  "position" integer not null default 0,
  "alt" text
);
create index "media_product_id_idx" on "media"("product_id");

-- ---------------------------------------------------------------------------
-- TutorialContent
-- ---------------------------------------------------------------------------
create table "tutorial_content" (
  "id" uuid primary key default gen_random_uuid(),
  "product_id" uuid not null references "product"("id") on delete cascade,
  "type" "tutorial_type" not null,
  "url" text not null,
  "label" text not null
);
create index "tutorial_content_product_id_idx" on "tutorial_content"("product_id");

-- ---------------------------------------------------------------------------
-- Customer
-- ---------------------------------------------------------------------------
create table "customer" (
  "id" uuid primary key default gen_random_uuid(),
  "name" text not null,
  "phone" text not null,
  "email" text,
  "address_json" jsonb,
  "created_at" timestamptz not null default now()
);
create unique index "customer_phone_unique" on "customer"("phone");

-- ---------------------------------------------------------------------------
-- Order
-- ---------------------------------------------------------------------------
create table "order" (
  "id" uuid primary key default gen_random_uuid(),
  "customer_id" uuid not null references "customer"("id") on delete restrict,
  "status" "order_status" not null default 'pending_whatsapp',
  "payment_method" "payment_method" not null,
  "total" integer not null,
  "items_snapshot" jsonb not null,
  "whatsapp_ref" text,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);
create index "order_customer_id_idx" on "order"("customer_id");
create index "order_status_idx" on "order"("status");

-- ---------------------------------------------------------------------------
-- OrderItem
-- ---------------------------------------------------------------------------
create table "order_item" (
  "id" uuid primary key default gen_random_uuid(),
  "order_id" uuid not null references "order"("id") on delete cascade,
  "variant_id" uuid not null references "variant"("id") on delete restrict,
  "qty" integer not null,
  "unit_price" integer not null,
  constraint "order_item_qty_check" check ("qty" > 0)
);
create index "order_item_order_id_idx" on "order_item"("order_id");
create index "order_item_variant_id_idx" on "order_item"("variant_id");

-- ---------------------------------------------------------------------------
-- StockLedger
-- ---------------------------------------------------------------------------
create table "stock_ledger" (
  "id" uuid primary key default gen_random_uuid(),
  "variant_id" uuid not null references "variant"("id") on delete restrict,
  "delta" integer not null,
  "reason" "stock_reason" not null,
  "order_id" uuid references "order"("id") on delete set null,
  "created_at" timestamptz not null default now()
);
create index "stock_ledger_variant_id_idx" on "stock_ledger"("variant_id");
create index "stock_ledger_order_id_idx" on "stock_ledger"("order_id");

-- ---------------------------------------------------------------------------
-- Review
-- ---------------------------------------------------------------------------
create table "review" (
  "id" uuid primary key default gen_random_uuid(),
  "product_id" uuid not null references "product"("id") on delete cascade,
  "customer_id" uuid not null references "customer"("id") on delete cascade,
  "rating" integer not null,
  "body" text,
  "status" "review_status" not null default 'pending',
  "created_at" timestamptz not null default now(),
  constraint "review_rating_check" check ("rating" >= 1 and "rating" <= 5)
);
create index "review_product_id_idx" on "review"("product_id");
create index "review_customer_id_idx" on "review"("customer_id");

-- ---------------------------------------------------------------------------
-- Wishlist
-- ---------------------------------------------------------------------------
create table "wishlist" (
  "id" uuid primary key default gen_random_uuid(),
  "customer_id" uuid not null references "customer"("id") on delete cascade,
  "product_id" uuid not null references "product"("id") on delete cascade,
  "variant_id" uuid references "variant"("id") on delete cascade,
  "created_at" timestamptz not null default now()
);
create unique index "wishlist_customer_product_variant_unique"
  on "wishlist"("customer_id", "product_id", "variant_id");
create index "wishlist_customer_id_idx" on "wishlist"("customer_id");

-- ---------------------------------------------------------------------------
-- WhatsappConfig (singleton — configuration globale, cf. brief)
-- ---------------------------------------------------------------------------
create table "whatsapp_config" (
  "id" smallint primary key default 1,
  "phone_number" text not null,
  "updated_at" timestamptz not null default now(),
  constraint "whatsapp_config_singleton" check ("id" = 1)
);

-- Pas de table TrafficContext (Redis, hors périmètre DB — voir schema.ts).