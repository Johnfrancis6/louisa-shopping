# HANDOFF — Louisa Shopping

Resume point after a domain audit + 4 remediation phases (0→3). Storefront +
Better Auth + admin back-office, Next 16 App Router, Drizzle/Postgres (Supabase),
Redis (Upstash) cart, Netlify.

## Where things stand

- Branch: `test/ci`, ~19 commits ahead of `main` (nothing on `main`). Later work this
  cycle: icon consolidation, checkout address step, admin media manager, DB role fix.
- `npm run verify` (lint + typecheck + build) is **green**.
- **DB is live and migrated.** Supabase project `yhgnuilrgbudjtetlqur`. 3 migrations
  applied, `db:seed` run (10 categories / 1 zone / 1 whatsapp_config). RLS verified
  (see `HANDOFF_backend.md`). Connection roles: `app_anon` / `app_service` for the app,
  `postgres` (`DATABASE_URL_MIGRATE`) for scripts — Supabase `anon`/`service_role` are
  NOLOGIN. See memory `supabase-nologin-roles.md`.
- Coordination "contract" docs referenced in code comments (`contrat-technique-v2.5`,
  `db-reference`, `regles-coordination`) live in a Google Drive, **not in the repo**.
- Full phase-by-phase history: `~/.claude/projects/-home-ksfranco-projects-louisa-shopping/memory/audit-remediation-plan.md`

## DO THIS FIRST in the next session

1. **Read this file + the sub-file(s) for the area you're working on** (below). Don't
   re-audit — the audit is done.
2. `npm run verify` to confirm the tree is still green before changing anything.

## Remaining before merging `test/ci` → `main`

1. **Rotate the Sentry auth token** (git history `e7d81c7`) — *done per operator, 2026-09*.
2. Netlify + GitHub Actions secret **values** for `DATABASE_URL_ANON` / `DATABASE_URL_ADMIN`
   must point at `app_anon` / `app_service` — *done per operator, 2026-09*.
3. **Full authenticated smoke test** (browser + real Cloudinary): storefront buy flow →
   `/commander` 2-step address → order → WhatsApp link; `/admin/products/[id]` media
   upload/reorder/primary/delete; order lifecycle + `stock_ledger`.
4. **Visual QA** (mobile-first): icon swap, 2-step checkout, media grid, sticky CTA.
5. `/code-review ultra` on the branch (user-triggered), then push → PR → `main`
   (CI `quality` + blocking Lighthouse on the deploy preview).

## Sub-files (load only the one you need)

| File | Covers |
|---|---|
| `HANDOFF_backend.md` | DB schema/migrations, RLS, auth, cart/checkout/orders/reviews actions, data layer, caching model |
| `HANDOFF_frontend.md` | storefront routes & components, design tokens, `cacheComponents` prerender rules, cart UI |
| `HANDOFF_admin.md` | admin app (`src/app/admin/*`), guards, the pages, media manager, what's still missing |
| `HANDOFF_dependencies.md` | dep cleanup done + remaining, version notes, tooling, CI |

## Cross-cutting watch points

- **`cacheComponents: true`** (Next 16) — no `export const dynamic`. Any component
  reading `cookies()`/`headers()`/`params`/`searchParams`/`connection()` must sit under
  `<Suspense>` or the route needs `export const instant = false`. This bites every new
  page that touches request data.
- **Two DB clients**: `dbAnon` (public reads, RLS — role `app_anon`) vs `dbAdmin`
  (bypass RLS, all PII + writes — role `app_service`). Never read
  `order`/`customer`/`stock_ledger`/auth tables via `dbAnon` (RLS + GRANTs both deny it).
- **Prices are server-authoritative** — `addToCart(variantId, qty)` and `createOrder`
  re-derive price from the DB. Never reintroduce a client-supplied `unitPrice`.
- **All money is integer FCFA.** No decimals anywhere.
- Data readers swallow DB errors (return empty/null). Good for resilience, but means a
  broken DB looks like "empty store" not an error — check server logs when debugging.
- `CLAUDE.md` has a stale trailing "SR-PTD" section pointing at a Windows path — ignore
  or delete it.
