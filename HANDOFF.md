# HANDOFF — Louisa Shopping

Resume point after a domain audit + 4 remediation phases (0→3). Storefront +
Better Auth + admin back-office, Next 16 App Router, Drizzle/Postgres (Supabase),
Redis (Upstash) cart, Netlify.

## Where things stand

- Branch: `test/ci`. Commits: `3d449e5` (phases 0–2), `fb43d4a` (phase 3). Nothing on `main`.
- `npm run verify` (lint + typecheck + build) is **green**. Build produces **21 routes**.
- **Nothing has been runtime-tested against a live DB.** `.env.local` Supabase creds
  are stale (`password authentication failed for user "postgres"`). Build still passes
  because every `lib/data/*` reader has try/catch → returns empty/null on DB failure.
- Coordination "contract" docs referenced in code comments (`contrat-technique-v2.5`,
  `db-reference`, `regles-coordination`) live in a Google Drive, **not in the repo**.
- Full phase-by-phase history: `~/.claude/projects/-home-ksfranco-projects-louisa-shopping/memory/audit-remediation-plan.md`

## DO THIS FIRST in the next session

1. **Read this file + the sub-file(s) for the area you're working on** (below). Don't
   re-audit — the audit is done.
2. If touching data flows: get a working DB first (see "Blocking user actions").
3. `npm run verify` to confirm the tree is still green before changing anything.

## Blocking user actions (not doable by the model — needs the human)

1. **Rotate the Sentry auth token** — it was committed in `.env.example` (scrubbed at
   HEAD, still in history commit `e7d81c7`).
2. **Fix Supabase connection strings** and set them in `.env.local`, Netlify env vars,
   and GitHub Actions secrets:
   - `DATABASE_URL_ANON` → a **non-privileged** Postgres role (so RLS applies)
   - `DATABASE_URL_ADMIN` → a role that **bypasses RLS** (service_role / owner)
   - also add `NEXT_PUBLIC_BASE_URL`
   (CI workflow already references the new names; old `DATABASE_URL` is gone.)
3. Once DB reachable: `npm run db:deploy` (migrate + RLS policies) → `npm run db:seed`
   → sign up at `/inscription` → `npm run db:promote-admin -- <email>`.
4. Netlify: confirm **auto build-on-push is ON** (GitHub Actions no longer deploys;
   `quality` job only lints/typechecks/builds).

## Sub-files (load only the one you need)

| File | Covers |
|---|---|
| `HANDOFF_backend.md` | DB schema/migrations, RLS, auth, cart/checkout/orders/reviews actions, data layer, caching model |
| `HANDOFF_frontend.md` | storefront routes & components, design tokens, `cacheComponents` prerender rules, cart UI |
| `HANDOFF_admin.md` | admin app (`src/app/admin/*`), guards, the 6 pages, what's still missing (media manager) |
| `HANDOFF_dependencies.md` | dep cleanup done + remaining, version notes, tooling, CI |

## Cross-cutting watch points

- **`cacheComponents: true`** (Next 16) — no `export const dynamic`. Any component
  reading `cookies()`/`headers()`/`params`/`searchParams`/`connection()` must sit under
  `<Suspense>` or the route needs `export const instant = false`. This bites every new
  page that touches request data.
- **Two DB clients**: `dbAnon` (public reads, RLS) vs `dbAdmin` (bypass RLS, all PII +
  writes). Never read `order`/`customer`/`stock_ledger`/auth tables via `dbAnon`.
- **Prices are server-authoritative** — `addToCart(variantId, qty)` and `createOrder`
  re-derive price from the DB. Never reintroduce a client-supplied `unitPrice`.
- **All money is integer FCFA.** No decimals anywhere.
- Data readers swallow DB errors (return empty/null). Good for resilience, but means a
  broken DB looks like "empty store" not an error — check server logs when debugging.
- `CLAUDE.md` has a stale trailing "SR-PTD" section pointing at a Windows path — ignore
  or delete it.
