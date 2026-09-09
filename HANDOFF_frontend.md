# HANDOFF — Frontend (storefront)

Scope: `src/app/(storefront)/*`, `src/app/layout.tsx`, `src/components/storefront/*`,
`src/components/ui/*`, CSS (`globals.css`, `design-system.css`).

## Status

**Done**
- One canonical tree: `src/app/(storefront)/` (the duplicate `[category]` tree + root
  `page.tsx` + orphan components were deleted in phase 0).
- Root `layout.tsx` = `<html>/<body>` + fonts + `<Toaster/>` only. Storefront chrome
  (navbar + mobile bottom nav) lives in `(storefront)/layout.tsx`.
- Routes: `/`, `/catalogue`, `/produits/[slug]`, `/panier`, `/recherche`, `/connexion`,
  `/inscription`, `/compte`, `/commander`, `/commandes/[id]`.
- Cart fully wired: `panier` page → `peekCart()`, `cart-client` calls real
  `updateCartItem`/`removeFromCart`, `CartBadge` shows real count, CTA → `/commander`.
- Real data everywhere (`lib/data/*`), no mocks. Filter facets on `/catalogue` come from
  `getCatalogFacets()`.
- Search works (`SearchBox` in navbar + `/recherche?q=`).
- CSS token aliases added in `globals.css`: `--color-ls-{primary,text,text-muted,
  background,surface,surface-2,border}` → mapped to existing `design-system.css` tokens.
  The cart components use this namespace.

**Blocked / untested**
- No visual QA (no live DB → catalogue/home render empty locally).
- Auth client flows (`signIn.email`/`signUp.email`) never exercised.

## Remaining tasks (priority order)

1. **Visual pass** once data exists — the two token namespaces (`ls-*` Tailwind
   utilities in the `(storefront)` tree vs `--color-ls-*` CSS vars in the cart tree) are
   both wired but were never seen side by side. Check the cart page especially.
2. `navbar.tsx` — the docstring still says search is a "stub"; it isn't anymore. Also the
   account link always goes to `/compte` (which redirects to login if needed) — consider
   showing logged-in state.
3. `/commandes/[id]` and `/compte` show a status label but no timeline/progress UI.
4. ~~Checkout has no address step~~ — done. `/commander` is now a 2-step client flow
   (`checkout/checkout-flow.tsx`): step 1 address form (pre-filled from
   `getMyDeliveryAddress()`), step 2 recap + payment + confirm. `checkout-form.tsx` deleted.
5. `product-purchase-experience.tsx` CTA is `fixed bottom-16` to clear the mobile bottom
   nav — verify it doesn't overlap on real devices; the value is a guess.
6. No `not-found.tsx` / `error.tsx` (only `global-error.tsx`). Add friendly ones.
7. `home/reassurance.tsx` and `hero.tsx` have placeholder copy + a demo Cloudinary image.
8. ~~Full icon consolidation to lucide~~ — done; all storefront icons are `lucide-react`,
   `@phosphor-icons/react` removed.

## Watch points

- **`cacheComponents` prerender rule** (see main HANDOFF). Pattern used here: static
  shell in the page component + `<Suspense fallback={...}><AsyncChild/></Suspense>` where
  the child does the `await params`/`await searchParams`/data read. `/connexion` +
  `/inscription` use `export const instant = false` instead (top-level `await getUserId()`).
- `CategoryScroll` calls `await connection()` before its DB read AND must stay under
  `<Suspense>` in `(storefront)/page.tsx` — otherwise the home page fails to prerender.
- **Never pass a function prop to `next/image`** (`loader={...}`) from a Server Component
  — the global loader in `next.config.ts` (`images.loaderFile`) already applies. This
  broke the build twice.
- `next/image` only allows `res.cloudinary.com` (`next.config.ts` remotePatterns).
- Server actions called from client components must be in a `'use server'` file:
  `lib/actions/catalog.ts` (`loadMoreProducts`) is the RPC boundary for infinite scroll;
  the cached logic is in `lib/data/products.ts`.
- Two `CartItem`-ish shapes existed; only one remains — `import type { CartItem } from
  '@/lib/actions/cart'`. Don't recreate `lib/types/cart.ts` or `lib/utils/cart.ts`.
- `design-system.css` is the design "source of truth" — don't add a 3rd palette; alias
  into it (as the phase-0 token block does).
- `globals.css` still has leftover `npx shadcn init` scaffold (`oklch` neutral `:root`
  blocks) layered under the Louisa mapping — works by last-wins, fragile, don't reorder.
- `sonner`'s `<Toaster/>` is mounted in root `layout.tsx`. `useTheme` (next-themes) has
  no provider — falls back to `'system'`, fine.
- shadcn `ui/*` components import `cn` from `@/lib/utils` (real `twMerge(clsx())`). The
  `cn` npm package was removed from direct deps.

## Resume instructions

1. `npm run dev` with a seeded DB.
2. Walk every storefront route; focus visual QA on `/panier`, `/produits/[slug]`,
   `/commander`, `/commandes/[id]`.
3. Test auth: `/inscription` → `/compte` → sign out; and the `?next=` redirect from
   `/commander` and `/commandes/[id]` when logged out.
4. Then the "Remaining tasks" list.
