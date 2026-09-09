# PRE-MERGE CHECKLIST — `test/ci` → `main`

Ordered by dependency. Don't skip ahead — later steps assume earlier ones are done.
`[ ]` = todo, `[x]` = done, `(you)` = human only, `(dev)` = code work.

---

## Stage 0 — Infra prerequisites `(you)`

Everything else depends on these.

- [x] **Rotate the Sentry auth token** (was in git history `e7d81c7`). *Done 2026-09.*
- [x] **DB secret *values*** in Netlify env + GitHub Actions secrets — `DATABASE_URL_ANON` → the `app_anon` connection string, `DATABASE_URL_ADMIN` → the `app_service` one. Values are in `.env.local`. *Done 2026-09.*
- [ ] **Add `DATABASE_URL_MIGRATE`** to your local `.env.local` if missing. Netlify/CI do **not** need it (no migrations run there).
- [ ] **Confirm Netlify deploy previews are ON** for pull requests. The `lighthouse-preview` CI job waits up to 300s for `louisa-shopping-dev.netlify.app` and **fails the PR** if no preview appears.

## Stage 1 — Decide on open issues `(you + dev)`

- [ ] **Reviews bug** (`FIXES.md` #1) — fix now (denormalize `review.authorName`, ~30 min) or file it and merge without it. Reviews fail gracefully (render empty), so deferring is defensible.
- [ ] **Demo products for Lighthouse** (`FIXES.md` #4) — the PR's Lighthouse run scores an empty catalog. Either add 2–3 demo products to `seed.ts`, or seed them manually on the preview DB before the PR, or accept the risk.

## Stage 2 — Authenticated smoke test `(you, browser)`

No browser automation is installed, so this is manual. `npm run dev`, sign up,
`npm run db:promote-admin -- <you>`, then walk through:

- [ ] **Storefront buy flow:** home → catalogue → product page → add to cart → `/panier` → adjust qty → "Commander".
- [ ] **Checkout wizard** (`/commander`): step 1 address form (Nom, Téléphone, Quartier/Ville, Indications) → "Continuer" → step 2 recap + "Modifier" link works + payment method → "Valider ma commande".
- [ ] **Order confirmation** (`/commandes/[id]`): shows the "Livraison" block; the green WhatsApp button opens a `wa.me` link whose text contains a `Livraison :` section.
- [ ] **Second order** pre-fills the address form from `customer.addressJson`.
- [ ] **Media manager** (`/admin/products/[id]`): upload 2–3 real images (Cloudinary round-trip) → they appear → ↑/↓ reorder persists → "Définir principale" moves an image to first + "Principale" badge follows → edit alt text → "Supprimer" (confirm dialog) removes it *and* the Cloudinary asset.
- [ ] **Storefront reflects it:** the product page shows the images in the admin order, primary first.
- [ ] **Order lifecycle** (`/admin/orders`): `pending_whatsapp → confirmed → processing` — confirm `stock_ledger` gets a row **only** on `confirmed → processing`, and variant stock drops.
- [ ] **Guards:** hitting `/admin/*` while logged out → redirects to `/connexion`.

## Stage 3 — Visual QA `(you, browser, mobile viewport)`

- [ ] **Icons** (Phosphor → Lucide swap): navbar, mobile bottom-nav (active tab `fill` state), cart quantity steppers, the WhatsApp button (now a generic `MessageCircle` bubble on the green button — acceptable?).
- [ ] **Checkout wizard** layout on a phone screen.
- [ ] **Media manager** grid on desktop.
- [ ] **Product page sticky CTA** sits at `bottom-16` — verify it clears the mobile bottom nav on a real device (the value is a guess — `HANDOFF_frontend.md`).
- [ ] Dark mode if applicable (`next-themes` is wired).

## Stage 4 — Deep review `(you)`

- [ ] **Run `/code-review ultra`** on the branch (billed, user-triggered — the model can't launch it). Do this *after* Stages 1–3 so it sees the final diff.
- [ ] Address anything it flags.

## Stage 5 — Merge `(you)`

- [ ] `npm run verify` green locally one more time.
- [ ] `git push origin test/ci` (currently 1 local commit ahead of origin).
- [ ] Open PR `test/ci` → `main`.
- [ ] CI `quality` (lint/typecheck/build) passes.
- [ ] CI `lighthouse-preview` passes (mobile perf ≥ 85, LCP < 2.5s, CLS < 0.1 — **blocking**).
- [ ] Merge. `sentry-release` fires automatically on push to `main`.

## After merge — backlog (not blockers)

See `FIXES.md` #5–#10: signed Cloudinary upload for video, tutorial-content CRUD,
variant edit/delete, `/admin/orders/[id]`, category reorder UI, a test runner.
