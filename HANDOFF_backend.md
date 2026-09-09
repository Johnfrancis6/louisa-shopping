# HANDOFF — Backend

Scope: `src/lib/db/*`, `src/lib/actions/*`, `src/lib/data/*`, `src/lib/auth*`,
`src/lib/whatsapp`, `drizzle/`, `supabase/`, `scripts/`.

## Status

**Done**
- Single clean migration `drizzle/0000_init.sql` regenerated from `schema.ts`
  (journal has only this entry). Includes the `category.parent_id` self-FK (now
  expressed via `foreignKey()` in `schema.ts`) and `authUser.phone` column.
- `schema.ts`: `authUser` has `phone` (nullable) + `role` (`'customer'|'admin'`,
  default customer). Money = integer FCFA everywhere.
- `dbAnon` / `dbAdmin` split in `db/client.ts` (lazy Proxy). Reads `DATABASE_URL_ANON`
  / `DATABASE_URL_ADMIN`.
- Better Auth: handler at `src/app/api/auth/[...all]/route.ts`; `auth.ts` passes real
  Drizzle table objects to the adapter, `phone`/`role` additionalFields, a
  `create.before` hook that validates phone uniqueness, `create.after` inserts the
  `customer` row (same id).
- `src/lib/auth-guards.ts` — `getSession()`, `getUserId()`, `getAdminUserId()` (role
  read from DB). Single source for all auth checks.
- `src/proxy.ts` (renamed from middleware, Next 16) — optimistic cookie guard on
  `/admin/*`.
- Server actions:
  - `cart.ts` — `addToCart(variantId, qty)` (server-derives everything),
    `updateCartItem`, `removeFromCart`, `getCart` (writes cookie — actions only),
    `peekCart` (read-only — Server Components). `CartItem` has `slug` + `stockQty`.
  - `checkout.ts` — `createOrder` re-resolves all prices from DB at order time;
    `getOrderWhatsappUrl(orderId)` (ownership-checked).
  - `orders.ts` — status transitions, `applyStockDelta` (atomic
    `SET stock_qty = stock_qty + d` guarded), `getOrder`/`getMyOrders` (use `dbAdmin`),
    `transitionOrder` (admin-guarded, validates via `lib/order-transitions.ts`).
  - `reviews.ts` — `createReview` (session-gated, `status:'pending'`, author from
    `customer.name`).
  - `admin/*.ts` — ALL now have `getAdminUserId()` guard + `revalidateTag`. Integer-FCFA
    validation. Reorder actions are transactional.
- Data layer `lib/data/*` — real `dbAnon` reads, `'use cache'` + `cacheTag`/`cacheLife`,
  each wrapped in try/catch → empty/null on failure.
- `supabase/policies.sql` is idempotent; `scripts/apply-policies.mjs` +
  `npm run db:policies` / `db:deploy` / `db:promote-admin`.
- `lib/order-transitions.ts` — single source for the order state machine.
- `lib/orders-display.ts` — status/payment French labels + `readSnapshot()`.

**Blocked / untested**
- Migrations, seed, RLS policies **never run against a real DB** (stale creds).
- Better Auth signup→login flow never exercised. The `phone` additionalField + the
  `create.before`/`after` hooks are unverified at runtime.
- Redis cart never exercised (Upstash creds unverified).

## Remaining tasks (priority order)

1. **Verify auth end to end** once DB works: signup at `/inscription` → check `user` +
   `customer` rows created with same id and `phone` populated → login → `/compte`.
2. **Verify RLS actually constrains `dbAnon`** — depends entirely on the Postgres role
   in `DATABASE_URL_ANON`. If it connects as `postgres`/owner, RLS is bypassed and the
   deny-by-default model is void. Test: with the anon connection, `SELECT * FROM "order"`
   must return 0 rows.
3. `createReview` — consider requiring the customer to have actually ordered the product
   (currently any authenticated customer can review any product).
4. ~~`checkout.ts` — `CheckoutInput.addressJson` is accepted but never persisted.~~
   **Done.** Address step wired: `CheckoutInput` now takes a typed `DeliveryAddress`
   `{ fullName, phone, city, directions? }`. `createOrder` validates it, freezes it on
   the new `order.deliveryAddress` jsonb column (migration `0001_noisy_blue_marvel`,
   **needs `npm run db:deploy`**), and recopies it to `customer.addressJson` (pre-fills
   next order via `getMyDeliveryAddress()`). Address is added to the WhatsApp message,
   `/commandes/[id]`, the admin orders table, and the CSV export.
5. `lib/data/*` `cacheLife` values are guesses (`minutes` for products/reviews, `hours`
   for categories/whatsapp). Revisit once real traffic patterns are known.
6. Seed script (`src/lib/db/seed.ts`) only creates categories/zones/whatsapp_config — no
   products, no admin. Add a few demo products+variants+media for a usable dev env.
7. `getStockLedgerForVariant` in `db/admin.ts` is unused — surface it in the admin stock
   page (ledger history) or remove.

## Watch points

- **`'use server'` files: every EXPORT must be `async function`.** A non-async exported
  wrapper silently strips ALL exports from the module ("module has no exports at all").
  Hit this with `admin/reviews.ts`. Non-exported helpers can be sync.
- `revalidateTag` tag names must stay aligned between writers (`admin/*.ts`) and readers
  (`lib/data/*.ts`): `categories`, `products`, `stock`, `stock:${variantId}`,
  `product:${slug}`, `reviews:${productId}`, `whatsapp-config`. Product detail readers
  also tag `products` so one `revalidateTag('products')` covers list + detail.
- Stock is **only** decremented `confirmed → processing` (`processOrder`), recredited on
  cancel/return. Never touch stock in checkout.
- `order.itemsSnapshot` jsonb is frozen at order time — shape in `checkout.ts`
  (`buildItemsSnapshot`), read via `readSnapshot()` in `lib/orders-display.ts`. Keep in
  sync if you change the shape.
- `whatsapp_config` is a singleton (`CHECK id = 1`); admin action upserts id=1.
- `drizzle-kit` is now a **devDependency** — fine (only `db:*` scripts + a type import
  in `drizzle.config.ts` use it).
- If you regenerate migrations: the self-FK on `category` must survive — it's in
  `schema.ts` via `foreignKey()`, don't drop it.
- `dbAdmin`/`dbAnon` are Proxies — Better Auth's adapter can't introspect them, hence the
  explicit `schema: { user: authUser, ... }` mapping in `auth.ts`. Keep it.

## Resume instructions

1. Get a working DB (see main HANDOFF "Blocking user actions").
2. `npm run db:deploy && npm run db:seed`.
3. `npm run dev`, sign up, promote yourself admin, then walk: add to cart → `/commander`
   → `/commandes/[id]` → confirm on WhatsApp; and `/admin/orders` transition through the
   full state machine, checking stock moves at `processing`.
4. Only then start on the "Remaining tasks" list.
