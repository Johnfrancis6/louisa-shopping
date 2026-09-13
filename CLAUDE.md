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

Domain model: `category` (self-referential tree) → `product` → `variant` (SKU, stock, price override). `order` freezes an `itemsSnapshot` jsonb at creation. Lifecycle (`src/lib/order-transitions.ts`): `pending_whatsapp → confirmed → delivered`, plus `cancelled` from `pending_whatsapp`/`confirmed`. `stock_ledger` is the **only** source of truth for stock movements — stock is **not** decremented at checkout, only on `confirmed → delivered`. (`processing`/`shipped` remain in the enum for historical rows.) `zone` + `product.deliveryZones` jsonb are hybrid (jsonb entry may reference a `zone.id` or stand alone). `whatsapp_config` is a singleton (`CHECK id = 1`). `home_block` (slot `hero`/`rail`/`news`/`process`) carries the home's editorial images, copy and links.

### Identity — Better Auth

`src/lib/auth.ts` (server only) / `src/lib/auth-client.ts` (`"use client"` only — never import `auth.ts` from a client component). Email + password, DB-backed sessions (30d) for immediate revocation, connects via `dbAdmin`.

Standard Better Auth tables (`user`/`session`/`account`/`verification`, names hard-coded by the adapter) are **separate** from `customer` — a post-signup `databaseHooks.user.create.after` hook inserts a `customer` row with the **same id**. `phone` is a required signup field because `customer.phone` is `notNull unique`. `customer.id` is `text` (not `uuid`) with a real FK to `user.id`.

### Storefront request flow

- `cacheComponents: true` (Next 16) — pages are **static by default**. Anything reading `cookies()`/`headers()` or live data must be isolated in its own `<Suspense>` boundary (see `src/app/layout.tsx` → `CartBadge`). Data-fetch helpers use `'use cache'` + `cacheLife()` + `cacheTag()` (`src/lib/data/*`).
- Cart: `src/lib/actions/cart.ts` — Server Actions over Upstash Redis, keyed by an httpOnly `cart-session` cookie (7d TTL). `addToCart(variantId, qty)` is the only entry point (product page and product card) — the client sends just the id and quantity, the server re-reads price/labels/image/stock from the DB.
- Checkout: `src/lib/actions/checkout.ts` `createOrder()` — auth check → read Redis cart → insert `order` + `order_item` in a `dbAdmin.transaction` → clear cart → `buildWhatsappUrl()`. No customer mutation here (the signup hook owns it). Status starts `pending_whatsapp`.
- WhatsApp: `src/lib/whatsapp/index.ts` — **no API**, just formats a `wa.me/<number>?text=…` link from the `whatsapp_config` singleton.

### Admin

`src/app/admin/` (a plain segment, not a route group). Reads: `src/lib/db/admin.ts` (joins/aggregates, `dbAdmin` only, read-only). Writes: `src/lib/actions/admin/*.ts` only. CSV export at `src/app/admin/orders/export/route.ts`.

`/admin/home` edits the `home_block` table — the hero image, the « Sélections » rail, the news cards and the process illustrations. Each storefront section falls back to a hardcoded draft when its slot has no visible row, so an empty table never breaks the page.

Three layers of authorization, all required: `src/proxy.ts` (edge, optimistic cookie check only) → `src/app/admin/layout.tsx` (`getAdminUserId()`, role read from the DB) → every admin Server Action re-checks. Never rely on the proxy alone.

### Layout / UI

- **Storefront design language: see [`docs/design/`](docs/design/README.md).** Read it before touching any storefront page — it carries the non-negotiables (violet `#B818C9` primary, `#25D366` reserved for the WhatsApp confirm button only, the `rounded-ls-*` radius scale, no Framer Motion) and a **Tailwind v4 gotcha**: `rounded-[--radius-ls-md]` renders square corners — always `rounded-ls-md`. The home page (`/`) is the coherence reference.
- Path alias `@/*` → `src/*`.
- Tailwind v4 (CSS-config via `@tailwindcss/postcss`, no `tailwind.config.ts`), shadcn/ui (`components.json`, `src/components/ui/`), `@base-ui/react`, `lucide-react`, `sonner` toasts. **No carousel library and no `@phosphor-icons/react`** — neither is installed; the home rail (`src/components/storefront/home/catalog-rail.tsx`) is CSS scroll-snap + pointer drag.
- `cn` helper: `src/lib/utils.ts` (`clsx` + `tailwind-merge`, the standard shadcn helper). (Note: `src/lib/utils/` — with a slash — is a *different* directory of domain helpers: `format.ts`, `color.ts`, `contrast.ts`, `catalog-filters.ts`.)
- Images: **ImageKit** — see [`docs/imagekit.md`](docs/imagekit.md) for the account setup. Custom loader `src/lib/images/loader.ts` appends `?tr=w-…,q-…,f-auto,c-at_max` and still handles legacy `res.cloudinary.com` URLs. Server-side upload/delete in `src/lib/images/imagekit.ts` (Basic auth, private key). **The ImageKit delivery URL does not contain the `fileId`** — it must be stored at upload time (`media.publicId`, `home_block.imageId`) or the remote asset can never be deleted. Next/Netlify image optimization is bypassed. `next.config.ts` forces `Cache-Control: no-store` on `/commander` and `/commandes/*`.
- Sentry wired via `instrumentation.ts` + `sentry.*.config.ts`, browser requests tunneled through `/monitoring`.

## Deploy / CI

- **Netlify builds from Git natively** (`netlify.toml`, OpenNext adapter auto-provisioned — do not add `@netlify/plugin-nextjs` manually). Netlify's automatic build-on-push must stay **enabled** per the current setup; GitHub Actions no longer deploys.
- `.github/workflows/ci-cd.yml`: `quality` (lint → typecheck → build) on every PR/push to `main`; `lighthouse-preview` (mobile perf ≥ 85, LCP < 2.5s, CLS < 0.1 — blocking) on PRs; `sentry-release` on push to `main`.
- Build secrets are GitHub Actions Secrets mirroring `.env.example` names.

## Known rough edges

(The old mock-data / two-storefronts / `[category]` / no-auth-route items were all
resolved in phases 0–3. `src/lib/data/*` reads the real DB via `dbAnon`; the single
live tree is `(storefront)` + `admin` + `api`; Better Auth is at
`src/app/api/auth/[...all]/route.ts`.)

- **DB connection roles**: `dbAnon`/`dbAdmin` connect as `app_anon`/`app_service`
  (dedicated LOGIN roles) — Supabase's `anon`/`service_role` are NOLOGIN. Migrations,
  seed, `promote-admin` use `DATABASE_URL_MIGRATE` (`postgres`). Table GRANTs for the
  app roles live in `supabase/policies.sql`. See `.env.example`.
- **Admin is partial**: product detail (`/admin/products/[id]`) now has the field
  editor (name / description / price / category, via `updateProduct`) plus the
  media manager — still no variant edit/delete, tutorial-content CRUD, or
  `/admin/orders/[id]` detail. **`product.slug` is deliberately not editable**:
  it is the public URL and the `product:<slug>` cache tag.
- **Image upload** goes through a Server Action (`bodySizeLimit` 8 MB) — fine for
  photos. Video is explicitly refused; it needs a browser-side signed upload to
  get past the 8 MB cap. The `cloudinary` npm package is still installed but no
  longer imported anywhere.
- `src/lib/db/seed.ts` seeds categories/zones/whatsapp_config only — no demo products.
- No test runner / no tests.
- `/compte` and `/commander` guard with in-page `redirect()` (PPR: returns a 200 shell
  then redirects in the stream) rather than the edge 307 that `src/proxy.ts` does
  for `/admin/*`. (Next 16 renamed `middleware.ts` → `proxy.ts` — that is why
  there is no `middleware.ts` in this repo.)

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


---

# MANDATORY: Post-Task Documentation (SR-PTD)

**CRITICAL: After completing ANY task that modifies files, you MUST invoke this skill:**

```
Skill tool -> skill: "sr-ptd-skill"
```

**This is NOT optional. Skipping this skill means the task is INCOMPLETE.**

When planning ANY development task, add as the FINAL item in your task list:
```
[ ] Create SR-PTD documentation
```

### Before Starting Any Task:
1. Create your task plan as usual
2. Add SR-PTD documentation as the last task item
3. This step is MANDATORY for: features, bug fixes, refactors, maintenance, research

### When Completing the SR-PTD Task:
1. Read `~/.claude/skills/sr-ptd-skill/SKILL.md` for full instructions
2. Choose template: Full (complex tasks) or Quick (simple tasks)
3. Create file: `SR-PTD_YYYY-MM-DD_[task-id]_[description].md`
4. Save to: `C:/projects/Skills/Dev_doc_for_skills`
5. Fill all applicable sections thoroughly

### Task Completion Criteria:
A task is NOT complete until SR-PTD documentation exists.

### If Conversation Continues After Task:
Update the existing SR-PTD document instead of creating a new one.

---
