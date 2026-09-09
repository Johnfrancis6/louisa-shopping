# HANDOFF — Admin

Scope: `src/app/admin/*`, `src/components/admin/*`, `src/lib/actions/admin/*`,
`src/lib/db/admin.ts`.

## Status

**Done**
- `src/app/admin/` is a **real path segment** (was a `(admin)` route group → routes
  resolved without `/admin`). `admin/layout.tsx` enforces the admin role via
  `getAdminUserId()` (redirects to `/connexion?next=/admin/orders`), `export const
  instant = false`.
- 6 pages, all functional (list + mutate):
  - `/admin/orders` — table + per-row status-transition buttons (`OrderTransitions`,
    shows only valid next states from `lib/order-transitions.ts`).
  - `/admin/products` — list, create product, toggle active, inline "add variant".
  - `/admin/categories` — list, create, toggle visibility, delete.
  - `/admin/stock` — `listStockOverview` + inline ledger-backed adjustment.
  - `/admin/reviews` — moderation (approve/reject). NEW this session — reviews had no
    approval path, so nothing ever became publicly visible.
  - `/admin/whatsapp` — config upsert form.
- `/admin/orders/export` (CSV) — now returns 403 unless `getAdminUserId()` passes (was
  fully open, leaked the whole customer list).
- `AdminSidebar` / `OrderStatusBadge` rewritten with **plain Tailwind** — the old
  `--ls-*` / `--ls-space-*` token namespace was undefined; `globals-admin.css` deleted.
- Every `admin/*.ts` action has the admin guard + `revalidateTag` (added phase 2).
- `admin/orders.ts` collapsed to a thin façade over `transitionOrder`.

**Blocked / untested**
- No live DB → admin pages render empty, mutations unverified.
- No admin user exists (needs `db:promote-admin`).

## Remaining tasks (priority order)

1. **Product detail page `/admin/products/[id]`** — partially built.
   - ~~media manager~~ **done**: `src/app/admin/products/[id]/page.tsx` +
     `components/admin/media-manager.tsx`. View / upload (multi) / reorder (↑↓) /
     set primary / delete. Primary image = `media.position === 0` (no `is_primary`
     column — storefront already sorts by position). New `media.public_id` column
     (migration `0002_foamy_prowler`, **needs `db:deploy`**) so delete also removes
     the Cloudinary asset (best-effort; falls back to deriving public_id from the URL).
     `next.config.ts` `experimental.serverActions.bodySizeLimit` bumped to 8 MB.
     Reachable from the catalogue list ("Gérer les images").
   - **signed direct-to-Cloudinary upload** — still TODO for video. Current
     `uploadAndAddMedia` streams through a Server Action (now 8 MB limit → fine for
     photos, not video). Add `getCloudinaryUploadSignature()` + client upload.
   - tutorial content CRUD (`tutorial_content` table — no actions or UI yet at all)
   - edit/delete variants (only create exists), edit product fields (name/description/
     price/deliveryZones), delivery-zones editor
2. **Category reorder UI** — `reorderCategories` action exists (transactional). Add
   up/down buttons or drag. Currently position is read-only in the table.
3. `/admin/orders` — add a detail view (`/admin/orders/[id]`) with full item breakdown,
   customer info, and a field to record `order.whatsappRef` (admin fills this at
   confirmation per the contract — no UI for it yet).
4. Admin dashboard `/admin` currently just redirects to `/admin/orders` — could show
   counts (pending orders, low stock, pending reviews).
5. Stock page — show `stock_ledger` history per variant (`getStockLedgerForVariant`
   exists, unused).
6. No admin auth UI (login is the shared `/connexion`). Fine, but there's no "you are
   logged in as X / sign out" in the admin chrome.
7. Zones (`zone` table) have no admin CRUD.

## Watch points

- **`'use server'` files: every export must be `async function`** (see backend handoff —
  hit this building `admin/reviews.ts`).
- All admin pages use the pattern: page = static shell + `<Suspense><Table/></Suspense>`,
  and `Table` does `await connection()` then the `dbAdmin` read wrapped in try/catch.
  Keep this — `export const dynamic` is not allowed under `cacheComponents`.
- Admin reads go through `src/lib/db/admin.ts` (`dbAdmin` only, read-only). Writes go
  through `src/lib/actions/admin/*` only. Don't mutate from `db/admin.ts`.
- `getAdminUserId()` reads the role from the DB every call (not the cookie) — that's
  deliberate (immediate revocation). Don't "optimize" it to trust the session.
- `proxy.ts` only does an optimistic cookie check on `/admin/*` (edge runtime, no DB).
  Real enforcement is `admin/layout.tsx` + each action. Don't rely on `proxy.ts` alone.
- The transition state machine is `lib/order-transitions.ts` — one source. Both
  `transitionOrder` (effects) and `OrderTransitions` (UI) read it.
- Admin components are plain Tailwind (`bg-neutral-*`, `border`, etc.) + occasional
  `ls-accent`. Keep it simple; don't reintroduce `--ls-space-*`.

## Resume instructions

1. Seed DB, `npm run db:promote-admin -- <your-email>`, `npm run dev`, open `/admin`.
2. Smoke-test each of the 6 pages: create a category, create a product + variant, adjust
   stock, run an order through `pending_whatsapp → … → delivered`, moderate a review,
   set the WhatsApp config.
3. Then start on task 1 (`/admin/products/[id]` + media).
