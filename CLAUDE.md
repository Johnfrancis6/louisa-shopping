# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Louisa Shopping** — a mobile-first storefront + admin back-office for a single merchant in Burkina Faso. Next.js 16 (App Router, `src/`), React 19, Drizzle/Postgres on Supabase, deployed on Netlify. No real payment: checkout creates an order and hands off to WhatsApp (`wa.me` link).

The codebase was built by several parallel "agents" (DevOps, DB, UI, Admin, Logique métier) coordinated through contract documents that live in a Google Drive, **not in this repo** (`01-architecture/contrat-technique-v2.5.md`, `07-agent-db/db-reference.md`, `00-brief/regles-coordination.md`). Source comments reference these heavily. When a comment cites a contract section (e.g. "contrat §C", "règle §6") you won't find it here — treat the comment's summary as the spec.

**Status: work in progress.** Expect duplicated/competing implementations and half-wired routes (see "Known rough edges").

## Commands

```bash
npm run dev          # next dev (http://localhost:3000)
npm run build        # next build
npm run lint         # eslint . (next/core-web-vitals + next/typescript)
npm run typecheck    # tsc --noEmit

npm run db:generate  # drizzle-kit generate — create migration from schema.ts
npm run db:migrate   # drizzle-kit migrate — apply migrations
npm run db:seed      # tsx src/lib/db/seed.ts — dev seed (categories, zones, whatsapp_config)
npm run db:studio    # drizzle-kit studio
```

Node 22. No test framework is configured — there are no tests and no test runner. `npm run lint && npm run typecheck && npm run build` is the full local check (mirrors the `quality` CI job).

## Environment variables

`.env.example` is the canonical list of service credentials, **but the names it uses for the DB URL are out of date**. The code and `drizzle.config.ts` actually read:

- `DATABASE_URL_ANON` — Postgres connection as Supabase `anon`/`authenticated` role (RLS enforced). Used by `dbAnon`.
- `DATABASE_URL_ADMIN` — Postgres connection as `service_role` (bypasses RLS). Used by `dbAdmin`, Better Auth, migrations, seed.

`.env.local` has the correct names. `drizzle-kit` and `tsx` do not auto-load `.env.local`, so `drizzle.config.ts` and `seed.ts` load `.env` then `.env.local` explicitly.

## Architecture

### Data access — two clients, never mix them

`src/lib/db/client.ts` exports `dbAnon` and `dbAdmin` (lazy-initialized Drizzle instances via a Proxy — safe to import at module load, connects on first query). **Server-only** — never import from a `"use client"` component or expose raw.

- `dbAnon`: **public reads only**. RLS active (`supabase/policies.sql` — deny-by-default safety net).
- `dbAdmin`: bypasses RLS. Everything nominative (Customer, Order, Wishlist, auth tables) goes through `dbAdmin`.

**There is no RLS ↔ Better Auth bridge.** Owner authorization ("a customer only sees their own orders") is enforced *in TypeScript* inside Server Actions — `dbAdmin` query + explicit check like `order.customerId === session.user.id`. RLS never uses `auth.uid()`.

### Schema — `src/lib/db/schema.ts`

Single source of truth for every table; import types from here, never redefine. Conventions: `uuid` PKs (`defaultRandom()`), snake_case SQL / camelCase TS, `createdAt`/`updatedAt` on everything. **All money is integer FCFA** (no decimals — CFA franc has no practical subunit). Lowercase table exports (`category`, `product`, …) plus plural aliases (`categories`, `products`, …) kept for back-compat with older actions.

Domain model: `category` (self-referential tree) → `product` → `variant` (SKU, stock, price override). `order` freezes an `itemsSnapshot` jsonb at creation. `stock_ledger` is the **only** source of truth for stock movements — stock is **not** decremented at checkout, only on `confirmed → processing`. `zone` + `product.deliveryZones` jsonb are hybrid (jsonb entry may reference a `zone.id` or stand alone). `whatsapp_config` is a singleton (`CHECK id = 1`).

### Identity — Better Auth

`src/lib/auth.ts` (server only) / `src/lib/auth-client.ts` (`"use client"` only — never import `auth.ts` from a client component). Email + password, DB-backed sessions (30d) for immediate revocation, connects via `dbAdmin`.

Standard Better Auth tables (`user`/`session`/`account`/`verification`, names hard-coded by the adapter) are **separate** from `customer` — a post-signup `databaseHooks.user.create.after` hook inserts a `customer` row with the **same id**. `phone` is a required signup field because `customer.phone` is `notNull unique`. `customer.id` is `text` (not `uuid`) with a real FK to `user.id`.

### Storefront request flow

- `cacheComponents: true` (Next 16) — pages are **static by default**. Anything reading `cookies()`/`headers()` or live data must be isolated in its own `<Suspense>` boundary (see `src/app/layout.tsx` → `CartBadge`). Data-fetch helpers use `'use cache'` + `cacheLife()` + `cacheTag()` (`src/lib/data/*`).
- Cart: `src/lib/actions/cart.ts` — Server Actions over Upstash Redis, keyed by an httpOnly `cart-session` cookie (7d TTL). `addItemToCart()` (from the product page, carries full presentation data) is the real entry point; `addToCart(variantId)` is a stub.
- Checkout: `src/lib/actions/checkout.ts` `createOrder()` — auth check → read Redis cart → insert `order` + `order_item` in a `dbAdmin.transaction` → clear cart → `buildWhatsappUrl()`. No customer mutation here (the signup hook owns it). Status starts `pending_whatsapp`.
- WhatsApp: `src/lib/whatsapp/index.ts` — **no API**, just formats a `wa.me/<number>?text=…` link from the `whatsapp_config` singleton.

### Admin

Route group `src/app/(admin)/`. Reads: `src/lib/db/admin.ts` (joins/aggregates, `dbAdmin` only, read-only). Writes: `src/lib/actions/admin/*.ts` only. CSV export at `/(admin)/orders/export/route.ts`.

### Layout / UI

- Path alias `@/*` → `src/*`.
- Tailwind v4 (CSS-config via `@tailwindcss/postcss`, no `tailwind.config.ts`), shadcn/ui (`components.json`, `src/components/ui/`), `@base-ui/react`, both `@phosphor-icons/react` and `lucide-react`, Embla carousel, `sonner` toasts.
- `cn` helper: `src/lib/util.ts` re-exports from the `cn` package. (Note: `src/lib/utils/` is a *different* directory of domain helpers — `format.ts`, `color.ts`, `contrast.ts`, `catalog-filters.ts`.)
- Images: custom Cloudinary loader (`src/lib/cloudinary/loader.ts`) — Cloudinary already applies `f_auto,q_auto`, so Next/Netlify image optimization is bypassed. `next.config.ts` forces `Cache-Control: no-store` on `/checkout/*`.
- Sentry wired via `instrumentation.ts` + `sentry.*.config.ts`, browser requests tunneled through `/monitoring`.

## Deploy / CI

- **Netlify builds from Git natively** (`netlify.toml`, OpenNext adapter auto-provisioned — do not add `@netlify/plugin-nextjs` manually). Netlify's automatic build-on-push must stay **enabled** per the current setup; GitHub Actions no longer deploys.
- `.github/workflows/ci-cd.yml`: `quality` (lint → typecheck → build) on every PR/push to `main`; `lighthouse-preview` (mobile perf ≥ 85, LCP < 2.5s, CLS < 0.1 — blocking) on PRs; `sentry-release` on push to `main`.
- Build secrets are GitHub Actions Secrets mirroring `.env.example` names.

## Known rough edges

- `src/lib/data/*` and `src/lib/actions/catalog.ts` still return **mock data** (`MOCK_PRODUCTS`, `MOCK_CATEGORIES`); `src/lib/mock/` is another mock set. Cart/checkout/admin actions use the real DB.
- Two parallel storefronts exist: root `src/app/page.tsx` + `layout.tsx` **and** the `(storefront)` / `(admin)` route groups and a `[category]/` route. They overlap and duplicate components (multiple `product-card.tsx`, `filter-*` variants). Confirm which tree is live before editing.
- `src/app/[category]/page.tsx` is buggy WIP (`import { promise } from "better-auth"`, sync `params`/`searchParams` — Next 16 makes them `Promise`).
- `src/app/api/` exists but has no Better Auth handler route yet.

## Post-task documentation (existing instruction — verify before following)

The previous CLAUDE.md required invoking an `sr-ptd-skill` after any file-modifying task and writing a doc to `C:/projects/Skills/Dev_doc_for_skills`. That path is Windows and this is a Linux/WSL checkout, so it likely does not apply here — check whether the skill exists (`~/.claude/skills/sr-ptd-skill/`) before acting on it.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
