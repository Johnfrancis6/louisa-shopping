# FIXES — known issues & how to resolve them

Each entry: **symptom**, **where**, **fix**, **effort**, **blocks merge?**

Legend for "blocks merge": 🔴 yes · 🟡 your call · 🟢 no (post-merge backlog).

---

## 1. Product reviews never display 🟡 → ✅ done

**Resolved 2026-09-09** (commit `da52ed2`). Denormalized `review.authorName`
(migration `0003`, applied to the live DB); `createReview()` freezes the name at
write time, `getApprovedReviews()` no longer joins `customer`. Original notes
below for context.


**Symptom.** Product pages show no reviews. Dev log:
`[data/reviews] getApprovedReviews ... permission denied for table customer`.

**Where.** `src/lib/data/reviews.ts:28` — `getApprovedReviews()` runs on `dbAnon`
and does `.innerJoin(customer, ...)` to read `customer.name` as the review author.
`app_anon` has no access to `customer` (deny-by-default — correct for PII), so the
whole query fails and the `try/catch` returns `[]`.

**Fix (recommended — matches the `order.itemsSnapshot` freeze-at-write pattern):**

1. `src/lib/db/schema.ts` `review` table — add `authorName: text("author_name")`.
   (There are 0 reviews in the DB, so `.notNull()` is safe if you prefer.)
2. `npm run db:generate` → commit the migration. Apply with `npm run db:deploy`.
3. `src/lib/actions/reviews.ts` `createReview()` — it already fetches the customer
   row (~line 42). Also select `customer.name` and write it to `review.authorName`
   in the `insert` (~line 60).
4. `src/lib/data/reviews.ts` — drop the `customer` import and the `.innerJoin`;
   `select({ author: review.authorName, ... }).from(review)` only.

**Alternative (1 line, less clean):** switch `getApprovedReviews` to `dbAdmin`.
It's a read-only public query with no ownership check, but it breaks the
"public reads go through `dbAnon`" convention.

**Effort:** ~30 min (recommended) / 2 min (alternative).

---

## 2. Netlify + GitHub secret values 🔴 → ✅ done

`DATABASE_URL_ANON` / `DATABASE_URL_ADMIN` in Netlify env vars and GitHub Actions
secrets must be the `app_anon` / `app_service` connection strings, not the old
`anon` / `service_role` ones (which fail with `EAUTHQUERY` at runtime).
**Reported done by the operator, 2026-09.** Re-verify by opening a PR and
checking the Netlify preview actually serves data.

---

## 3. Sentry auth token rotation 🔴 → ✅ done

Was committed in `.env.example` and is still in git history (`e7d81c7`).
Scrubbed at HEAD. **Reported rotated by the operator, 2026-09.** The old token in
history is dead once rotated; a full `git filter-repo` scrub is optional.

---

## 4. Lighthouse CI scores an empty catalog 🟡

**Symptom.** The PR's blocking `lighthouse-preview` job runs against a storefront
with 0 products — layout/LCP may not reflect reality, and could pass or fail
misleadingly.

**Where.** `src/lib/db/seed.ts` seeds categories/zones/whatsapp_config only.

**Fix.** Add 2–3 demo products + variants + `media` rows (real Cloudinary URLs)
to `seed.ts`, **or** insert them manually on the preview DB before opening the PR.
`HANDOFF_backend.md` task 6.

**Effort:** ~20 min.

---

## 5. Cloudinary video upload 🟢

**Where.** `src/lib/actions/admin/media.ts` `uploadAndAddMedia()` streams the file
through a Server Action. `next.config.ts` sets `bodySizeLimit: '8mb'` — fine for
photos, too small for video.

**Fix.** Signed direct browser→Cloudinary upload: a `getCloudinaryUploadSignature()`
action returns `{ timestamp, signature, apiKey, folder }`; the browser POSTs the
file straight to `https://api.cloudinary.com/v1_1/<cloud>/auto/upload`; then call
`addMedia({ url, publicId, type: 'video' })`. `HANDOFF_admin.md` task 1.

**Effort:** ~half a day. **Only needed when video is actually a requirement.**

---

## 6. Admin is partial 🟢

`/admin/products/[id]` has the **media manager only**. Still missing, all in
`HANDOFF_admin.md` task 1:

- product-field editor (name / description / price / `deliveryZones`)
- variant edit + delete (only create exists)
- `tutorial_content` CRUD — no actions or UI at all
- `/admin/orders/[id]` detail view + a field to record `order.whatsappRef`
- category reorder UI (`reorderCategories` action exists, no buttons)

---

## 7. `.nvmrc` missing 🟢

Node 22 is declared in `netlify.toml` and `.github/workflows/ci-cd.yml` but not
pinned for local dev. Add `echo "22" > .nvmrc`. `HANDOFF_dependencies.md` task 5.

---

## 8. `/compte` and `/commander` guard with in-page `redirect()` 🟢

Unlike `/admin/*` (middleware → clean 307), these call `redirect('/connexion?...')`
inside a Suspense child. With PPR that returns a **200 shell** then redirects in
the stream. Fine for real browsers; a plain bot/crawler sees a 200 + skeleton.
Low priority — move the check to middleware if it ever matters for SEO.

---

## 9. No test runner 🟢

None configured. When adding one (`vitest` suggested), start with the pure logic
in `HANDOFF_dependencies.md` task 8:

- price derivation — `src/lib/actions/checkout.ts`, `src/lib/actions/cart.ts`
- stock ledger math — `src/lib/actions/orders.ts` `applyStockDelta`
- `src/lib/order-transitions.ts`

---

## 10. Housekeeping 🟢

- `CLAUDE.md` still has a trailing "Post-task documentation / SR-PTD" section
  pointing at a Windows path — delete it.
- `next-env.d.ts` shows as modified in `git status` (Next regenerates it) — decide
  to commit the current form or add it to `.gitignore`.
- `package.json` has an `allowScripts` block (lavamoat convention) with no lavamoat
  tooling installed — remove it or add the tooling. `HANDOFF_dependencies.md` task 7.
