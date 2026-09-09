# HANDOFF — Dependencies & tooling

Scope: `package.json`, lockfile, `next.config.ts`, `.github/workflows/ci-cd.yml`,
`netlify.toml`, `eslint.config.mjs`, `postcss.config.mjs`, Sentry config.

## Status

**Done**
- Removed (unused): `@supabase/supabase-js`, `autoprefixer`, `cmdk`,
  `embla-carousel-react`, `tailwindcss-animate`, `uuid`, `@types/uuid`.
- `uuid` → `crypto.randomUUID()` in `cart.ts` / `checkout.ts` / `orders.ts`.
- `drizzle-kit` + `shadcn` moved to `devDependencies`.
- `cn` package dropped from direct deps (still transitive via `shadcn`); real
  `cn = twMerge(clsx())` in `src/lib/utils.ts`; all `ui/*` import from `@/lib/utils`.
- Deleted unused shadcn components: `carousel.tsx`, `command.tsx`, `accordion.tsx`.
- Lockfile synced — `npm ci --dry-run` passes.
- `.env.example` scrubbed (real Sentry token removed) + `DATABASE_URL` renamed to
  `DATABASE_URL_ANON` / `DATABASE_URL_ADMIN`; added `NEXT_PUBLIC_BASE_URL`.
- CI workflow (`ci-cd.yml`) env block updated to the new var names.
- `scripts/`: `apply-policies.mjs`, `promote-admin.mjs`. New npm scripts: `verify`,
  `db:policies`, `db:deploy`, `db:promote-admin`.
- `postcss.config.mjs` — named const (lint clean).
- Deleted dead files: root `instrumentation.ts` (kept `src/instrumentation.ts`), old
  hand-written `drizzle/0000_init.sql`.

**Not done**
- `@import "shadcn/tailwind.css"` in `globals.css` — still there, depends on the
  `shadcn` devDep resolving at build (it does; verify passes).

**Done (later)**
- Icon consolidation to lucide complete. 8 files swapped (search-box, empty-cart,
  navbar, mobile-bottom-nav, `commandes/[id]`, reassurance, cart-summary,
  cart-item-row). `@phosphor-icons/react` removed from `package.json` + lockfile.
  Mapping: `MagnifyingGlass→Search`, `House→House`, `Trash→Trash2`,
  `WhatsappLogo→MessageCircle` (lucide has no brand icons), others same name.
  Phosphor `weight=` dropped; `weight="fill"` active state in mobile-bottom-nav
  → `fill="currentColor"`, `weight="thin"` → `strokeWidth={1}`.

## Remaining tasks (priority order)

1. **Rotate the Sentry auth token** (human task — still in git history `e7d81c7`).
2. ~~Icon consolidation to lucide~~ — **done** (see "Done (later)" above).
3. Decide on `@import "shadcn/tailwind.css"` — either keep `shadcn` as a devDep forever,
   or inline what that stylesheet provides and remove the import + the dep.
4. `@base-ui/react` — check it's the intended package name (used by `ui/{button,sheet,
   dialog,slider,toggle,toggle-group,input,input-group}`). It resolved and builds; just
   confirm it's not a typo'd fork.
5. Add a `.nvmrc` (Node 22 — only declared in `netlify.toml` + CI right now).
6. `next.config.ts` `withSentryConfig` `webpack: { treeshake, automaticVercelMonitors }`
   — verify this is a valid option shape for the installed `@sentry/nextjs` version.
7. `allowScripts` block in `package.json` (lavamoat convention) — no lavamoat tooling
   installed. Leftover; remove or add the tooling.
8. No test runner. If you add one, `vitest` for: price derivation (`checkout.ts` /
   `cart.ts`), the stock ledger math (`orders.ts` `applyStockDelta`), and
   `lib/order-transitions.ts`.
9. 4 moderate `npm audit` advisories — review.

## Watch points

- **CI uses `npm ci`** — package.json and lockfile must stay in sync. After any
  `package.json` dep edit, run `npm install` and commit the lockfile, then
  `npm ci --dry-run` to confirm.
- `drizzle-kit` as devDep is fine: only `db:*` scripts use it at runtime, and
  `drizzle.config.ts` uses a type-only import.
- Versions in this repo are late-2026 releases (`next@16.3.4`, `react@19.2.8`,
  `tailwindcss@4.3.3`, `eslint@10`, `@types/node@26`, `lucide-react@1.41`, etc.) — they
  are real and resolved, **not** fabricated. Don't "downgrade to fix".
- Tailwind v4: config is CSS-based (`@tailwindcss/postcss`), there is no
  `tailwind.config.ts`. `autoprefixer` is not needed (removed).
- `netlify.toml`: build is native-Git on Netlify (OpenNext auto-provisioned). Do NOT add
  `@netlify/plugin-nextjs` manually. GitHub Actions `quality` job builds for fast-fail
  only; it does not deploy.
- `eslint.config.mjs` treats `react-hooks/set-state-in-effect` as an error (flat config,
  React 19 plugin). New effects that call `setState` synchronously will fail lint.
- Build/lint/typecheck all pass (`npm run verify`). Keep it that way — it's the CI gate.

## Resume instructions

1. `npm ci` (fresh), then `npm run verify` — confirm green.
2. If doing the icon swap: do it in one pass, `npm run verify`, then remove the phosphor
   dep in the same commit.
3. Tell the user to rotate the Sentry token if not already done.
