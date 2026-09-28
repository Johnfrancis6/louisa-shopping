# Production diagnosis — 2026-09-28

Target: `https://louisa-shopping-dev.netlify.app` (Netlify site `louisa-shopping-dev`,
id `45245047-45c9-40b5-a2be-69c23e94d6d8`), live commit `fa80396` = `main` HEAD.
This is a diagnosis only: nothing was changed in code, config or secrets.

## Summary

| # | Sev | Finding | Status |
|---|-----|---------|--------|
| D1 | **P0** | Supabase project paused → every DB query failed; sign-in, sign-up, checkout, search down (HTTP 500) | **Resolved** 2026-09-28 by restoring the project |
| D2 | P1 | Nothing alerts on this failure mode — the catalogue went empty with HTTP 200 | Open |
| D3 | P1 | The project will pause again after ~7 idle days (free tier) | Open |
| D4 | P1 | Pooler port of the Netlify runtime DB URLs (5432 vs 6543) still unverified | Open — needs dashboard |
| D5 | P2 | Missing security headers: CSP, X-Frame-Options, Referrer-Policy | Open |
| D6 | P2 | The logo is still served from Cloudinary | Open |
| D7 | P2 | 4 moderate `npm audit` advisories (esbuild via drizzle-kit, dev tooling only) | Open |
| D8 | **P1** | The footer WhatsApp link on every page is broken: its `href` is literal JSX text | **Fixed** in the working tree, not yet deployed |
| D9 | P1 | Mobile performance under budget on 3 of 4 pages (perf 74–78, LCP 2.6–4.5 s) | Open |
| D10 | P2 | The footer shows the placeholder "[Ville — À COMPLÉTER]" in production | Open |

**Not measured in this pass:** database integrity, grants and pool state, and Sentry issues. `env.local` has no `DATABASE_URL_*` or Sentry keys (see Blockers).

## D1 — Outage: Supabase project paused (P0, resolved)

**Symptom** — smoke test at 11:44 UTC:

| Route | Status | Body |
|---|---|---|
| `/connexion`, `/inscription`, `/commander`, `/recherche` | **500** | `Internal Server Error` (21 B) |
| `/`, `/catalogue`, `/panier`, `/compte`, legal pages | 200 | `/catalogue` rendered **no products** (75 KB vs 163 KB healthy) |
| `/admin`, `/admin/orders/export` | 307 → `/connexion?next=…` | correct |

**Cause.** Every query in the Netlify function logs failed with:
```
[cause]: (ENOTFOUND) tenant/user app_anon.yhgnuilrgbudjtetlqur not found   code XX000 FATAL
```
In the 72 hours of logs, `app_anon` has 50 of these errors and `app_service` has 1. The project host did not exist in public DNS:
```
dns.google/resolve?name=yhgnuilrgbudjtetlqur.supabase.co → Status 3 (NXDOMAIN)
dns.google/resolve?name=supabase.co                      → 76.76.21.21 (OK)
```
This is what a paused free-tier project looks like. The last deploy was 2026-09-17, which is 11 days of inactivity, well past Supabase's ~7-day pause threshold.

**Resolution.** The owner restored the project. The last DB error was at 11:44:43 UTC. At 12:09 UTC every route returned 200 with no new errors, `/catalogue` listed 10 products, and product pages and `/connexion` rendered.

**How it degraded** — useful to know for next time:
- **Home page:** kept showing real categories, because it is served from the prerendered static shell. The HTML was byte-identical before and after the outage.
- **Catalogue:** the product grid is a critical read with no fallback (by design, `src/lib/data/resilient.ts`), so it failed to the error boundary. That boundary renders client-side, which means the response still went out as **HTTP 200**.
- **Pages that read the DB outside any cache:** the auth pages, `/commander` and `/recherche` returned a hard 500.

## D2 — No alert on this outage (P1)

Two things combine here:
- The failure was only visible in the Netlify function logs.
- Most storefront pages answered 200 while the data was missing, so a plain status-code uptime check would have stayed green.

I could not check whether Sentry raised issues, because I had no token (see Blockers).

**Suggested fix:** add an external uptime check on `/connexion`, which returns a real 500 when the DB is down, or on a content assertion such as "`/catalogue` contains `/produits/`". Also make sure a Sentry alert rule fires on `area:data-layer`, the tag set by `reportDataError`.

## D3 — The project will pause again (P1)

On the free plan, Supabase pauses a project after about 7 days without activity. A low-traffic shop will hit this again.

**Suggested fix:** move to the Pro plan, or add a scheduled keep-alive that runs a real DB query at least every few days. A GitHub Actions cron job or a Netlify scheduled function would both work.

## D4 — Runtime pooler port unverified (P1)

This carries over from 2026-09-17: `DATABASE_URL_ANON` and `DATABASE_URL_ADMIN` must use port **6543**, the transaction mode. The Netlify CLI masks secret values, so `env:get` can't confirm the port. The names are all present, and `NEXT_PUBLIC_BASE_URL` and `BETTER_AUTH_URL` point at the production domain.

**Action:** check the two URLs in the Netlify UI, and the matching GitHub Actions secrets.

## D5 — Security headers (P2)

The response for `/` includes HSTS (`max-age=31536000; includeSubDomains; preload`) and `nosniff`. It has **no** `Content-Security-Policy`, `X-Frame-Options` / `frame-ancestors`, or `Referrer-Policy`.

**Suggested fix:** add them through `headers()` in `next.config.ts`, or in `netlify.toml`.

## D6 — Logo still on Cloudinary (P2)

The home page loads `res.cloudinary.com/r9iswf0z/.../brand/logo.png`. Everything else has moved to ImageKit, so the site still depends on the Cloudinary account.

## D7 — Dependency audit (P2)

`npm audit --omit=dev` reports 4 moderate advisories. They all come from esbuild ≤ 0.24.2 (GHSA-67mh-4wv8-2f99), reached through `@esbuild-kit/*` → `drizzle-kit`. This only affects the dev server: `drizzle-kit` is a devDependency and never ships to production. Watch for a `drizzle-kit` release that drops `@esbuild-kit`. Don't run `audit fix --force`, which would downgrade `drizzle-kit` to 0.18.

## D8 — Broken footer WhatsApp link (P1)

`src/components/storefront/layout/footer.tsx:118`, introduced in `9941d06`:
```tsx
<SocialLink label="WhatsApp" href="{`https://wa.me/${22660554400}?text=…`}">
```
The value is wrapped in double quotes, so JSX treats it as a plain string. Every page ships
`href="{`https://wa.me/${22660554400}?text=…`}"`, and a click leads to a broken
relative URL. WhatsApp is the shop's main contact channel. The playwright run hit this
as an `Invalid URL`.

**Fix (applied 2026-09-28, uncommitted):** the `href` is now built from the `whatsapp_config` singleton, the same source and fallback as the phone number shown just above. The number is normalised the same way as in `buildWhatsappUrl`, and the text goes through `URLSearchParams`. The result is
`https://wa.me/22660554400?text=Bonjour+Louisa+Shopping%2C+j%27ai+une+question.`
Lint and typecheck pass. The build was not run locally because there are no DB URLs; the CI `quality` job covers it.

## D9 — Mobile performance (P1)

Measured with Lighthouse CI and the repo's `lighthouserc.json` (mobile, simulated
throttling, 3 runs per page), run locally against production. Values are the median of the 3 runs.

| Page | Perf | A11y | LCP | CLS | TBT | TTFB | LCP element |
|---|---|---|---|---|---|---|---|
| `/` | 74 | 96 | 2.6 s | 0 | 313 ms | **3.2 s** | hero `<h1>` |
| `/catalogue` | 78 | 96 | 3.7 s | 0 | 311 ms | 0.5 s | `<h1>`, **render delay 1.9 s** |
| `/produits/air-fryer…` | 74 | 100 | **4.5 s** | 0 | 333 ms | 0.6 s | product `<img>`, **load delay 2.5 s** |
| `/panier` | 86 | 100 | 2.8 s | 0 | 409 ms | 0.6 s | empty-cart `<p>` |

Budgets are perf ≥ 85 and LCP ≤ 2.5 s. `lhci assert` fails on `/catalogue` (perf and LCP) and on the product page (LCP). TTI is above 4 s everywhere, which is a warning.

- **CLS is 0 on every page**, and best practices and SEO score 100.
- **Product page:** the main image only starts downloading 2.5 s after TTFB. It should be discoverable at once: `priority` / `fetchPriority="high"` on the first gallery image, with no lazy loading.
- **Home:** TTFB is 3.2 s even though the page is a prerendered shell. The function answers every request (`cache-control: private, no-store`, `x-nextjs-postponed: 1`), so a cold start lands on the LCP.
- **JS:** about 73 KB of unused JS on every page. The Sentry chunk is 172 KB gzip; commit `ae4ada4` already noted that `bundleSizeOptimizations` has no effect under Turbopack.

## D10 — Placeholder copy in production (P2)

The footer reads "Boutique en ligne à **[Ville — À COMPLÉTER]**" on every page (`footer.tsx:114`).

## Functional test — customer flow on production

This was a Playwright run in a mobile viewport. It created **one TEST account and one TEST order**. The `wa.me` link was read, never opened, so no WhatsApp message was sent.

| Step | Result |
|---|---|
| Home shows categories | ✅ 17 links |
| Catalogue lists products | ✅ 17 products |
| Search "sac" | ✅ 14 results |
| Add to cart from the product page | ✅ toast "… ajouté au panier", badge 1 |
| Cart shows the line | ✅ |
| `/commander` logged out → sign-in | ✅ `/connexion?next=/commander` |
| Sign-up → back to checkout | ✅ name and phone pre-filled from the account |
| Delivery zone offered | ✅ only one zone: "Ouagadougou" |
| Recap: subtotal, fee, total | ✅ 65 000 + 1 500 = 66 500 FCFA |
| Order created | ✅ `d640358d-1d93-4d84-99c5-7b53ed9c4509`, status "En attente de confirmation" |
| Order `wa.me` link | ✅ `wa.me/22660554400`; the message has the order number, client, payment, address, lines and total |
| `/compte` lists the order | ✅ |
| Cart emptied after the order | ✅ |
| `/admin` as a customer | ✅ sent to `/compte` (layout role check) |
| Browser console errors | ✅ none |

**Not tested:**
- **The admin side** (confirm → deliver → `stock_ledger`, `setOrderWhatsappRef`, CSV export): there are no admin credentials, and `promote-admin` needs `DATABASE_URL_MIGRATE`.
- **Reading another customer's order (IDOR):** this needs a second account and order.

**Test data to delete**, from Supabase or once admin CRUD exists:
- user and customer `diag-test-20260928@example.com` (phone `+22600009928`)
- order `d640358d-1d93-4d84-99c5-7b53ed9c4509`, status `pending_whatsapp`, with no stock movement

## Checks that passed

- **Deploy and CI:** production runs `fa80396`, which is `main` HEAD. The last 9 CI runs passed. The one failure, 15 days ago, was fixed by the next commit.
- **Lint and typecheck:** `npm run lint` and `npm run typecheck` pass locally with no errors.
- **Redis:** `PING` returns `PONG` and `DBSIZE` is 1. There are no stale `cart:*` or `order-lock:*` keys.
- **Auth guards when logged out:**
  - `/admin/*` returns a 307 at the edge.
  - `/compte`, `/commander` and `/commandes/<id>` redirect in-stream to `/connexion?next=…`. This is the documented PPR behaviour: a 200 shell followed by `NEXT_REDIRECT`.
- **Response times:** TTFB for storefront pages is 0.9–2.5 s. `/admin` took 4.3 s once, likely a cold start.

## Blockers for the rest of the plan

1. **Env file.** The owner confirms `env.local` is the only one. It is named without the leading dot, so `next dev`, `drizzle.config.ts` and `seed.ts` don't load it (they read `.env.local`). It holds 11 keys: Upstash, Better Auth and some unused ones (VAPID, Resend, Meilisearch, Google Places). It has none of `DATABASE_URL_ANON`, `DATABASE_URL_ADMIN`, `DATABASE_URL_MIGRATE`, Sentry or ImageKit. As things stand, **nobody can run migrations, the seed, `promote-admin`, or a local dev server with a DB from this machine**. Getting the three URLs back from the Supabase dashboard (Project settings → Database) would unblock the DB checks, the admin test and the test-data cleanup.
2. **Admin flow and IDOR test.** These need an admin account, which in turn needs item 1.

**Tooling note:** Lighthouse under WSL launches the Windows Chrome and fails, yet `lhci assert` still exits 0 with "0 URL(s)". What works is Playwright's `chromium-headless-shell` plus `CHROME_PATH` and `--no-sandbox`.
