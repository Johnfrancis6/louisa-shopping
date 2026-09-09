# START HERE — Louisa Shopping

Action-oriented docs. The `HANDOFF*.md` files at the repo root explain *how the
code works*; these `docs/` files tell you *what to do next*.

| File | Read it when you want to… |
|---|---|
| [`RUN-LOCAL.md`](RUN-LOCAL.md) | Get the app running on your machine (dev server, DB, admin user). |
| [`PRE-MERGE-CHECKLIST.md`](PRE-MERGE-CHECKLIST.md) | Ship `test/ci` → `main`. Ordered, with owners. |
| [`FIXES.md`](FIXES.md) | Fix a specific known issue. Each entry has file paths, a recommended approach, effort, and whether it blocks the merge. |

## Current state (2026-09-09)

- **Branch:** `test/ci` @ `f655083`, ~20 commits ahead of `main` (nothing on `main` yet). Local is 1 commit ahead of `origin/test/ci`.
- **`npm run verify` (lint + typecheck + build):** green.
- **Database:** live. Supabase project `yhgnuilrgbudjtetlqur`. 3 migrations applied, `db:seed` run (10 categories, 1 zone, 1 whatsapp_config). No products, no users.
- **DB roles:** `dbAnon` → `app_anon`, `dbAdmin` → `app_service` (both LOGIN roles; Supabase `anon`/`service_role` are NOLOGIN). Scripts use `postgres` via `DATABASE_URL_MIGRATE`. Passwords are in `.env.local`. See memory `supabase-nologin-roles.md` and `.env.example`.
- **Verified working:** storefront renders real products + Cloudinary images; auth signup → `user`/`session`/`account`/`customer`; all admin pages + media manager page; RLS deny-by-default + row filtering; Cloudinary upload/destroy; `db:seed` / `db:promote-admin` / `db:deploy`.
- **Not yet verified:** interactive flows (cart → checkout wizard → order; media manager reorder/primary/delete buttons; order lifecycle + stock ledger). Needs a browser — see `PRE-MERGE-CHECKLIST.md` step 3.
- ~~**Known bug:** product reviews don't display (`dbAnon` can't join `customer`).~~ Fixed 2026-09-09 — `FIXES.md` #1.

## The 30-second orientation

```
src/app/(storefront)/   storefront routes      src/lib/data/*        cached public reads (dbAnon)
src/app/admin/          admin back-office      src/lib/actions/*     server actions / writes (dbAdmin)
src/app/api/auth/       Better Auth handler    src/lib/db/schema.ts  single source of truth for tables
src/lib/db/client.ts    dbAnon / dbAdmin       supabase/policies.sql RLS + table GRANTs
drizzle/                migrations             scripts/              operator CLI (postgres role)
```
