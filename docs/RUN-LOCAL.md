# RUN LOCAL

Get the app running on your machine. ~5 min if `.env.local` is already populated.

## 0. Prerequisites

- **Node 22** (no `.nvmrc` yet — see `FIXES.md` #7). `node -v` → `v22.x`.
- **npm** (repo uses `package-lock.json`; CI runs `npm ci`).
- **`psql`** client, only if you want to run the DB checks in this doc.

## 1. Install

```bash
npm ci
```

## 2. Environment

The canonical list is **`.env.example`**. Copy it and fill every value:

```bash
cp .env.example .env.local        # if you don't already have one
```

`.env.local` is git-ignored and is the only env file that exists (there is no
`.env`). `drizzle-kit` and `tsx` don't auto-load it, so `drizzle.config.ts`,
`scripts/apply-policies.mjs`, `scripts/promote-admin.mjs` and `src/lib/db/seed.ts`
load `.env` then `.env.local` explicitly.

### The three Postgres URLs (important)

| Var | Role | Used by |
|---|---|---|
| `DATABASE_URL_ANON` | `app_anon` — LOGIN, `in role anon`, **no BYPASSRLS** | `dbAnon` (public reads, RLS enforced) |
| `DATABASE_URL_ADMIN` | `app_service` — LOGIN, `in role service_role`, **BYPASSRLS** | `dbAdmin`, Better Auth |
| `DATABASE_URL_MIGRATE` | `postgres` — LOGIN + DDL | migrations, `db:seed`, `db:promote-admin`, `db:policies` |

Supabase's `anon` / `service_role` roles are `NOLOGIN` — you cannot connect
directly as them. The two `app_*` roles already exist on the current Supabase
project. If you ever recreate them:

```sql
create role app_anon    login password '<generated>' in role anon;
create role app_service login password '<generated>' bypassrls in role service_role;
```

Pooler URL format: `postgresql://<role>.<project_ref>:<pw>@<region>.pooler.supabase.com:5432/postgres`

## 3. Database

The current Supabase DB is **already migrated and seeded** — skip to step 4.

From scratch (empty DB, or a new Supabase project):

```bash
npm run db:deploy          # drizzle-kit migrate  +  supabase/policies.sql (RLS + GRANTs)
npm run db:seed            # 10 categories, 1 zone, 1 whatsapp_config
```

`db:deploy` is idempotent. If it dies silently at "applying migrations…", the
DDL connection string is wrong — test it: `psql "$DATABASE_URL_MIGRATE" -c "select 1"`.

## 4. Run

```bash
npm run dev                # http://localhost:3000
```

## 5. Create an admin user

```bash
# sign up in the browser at http://localhost:3000/inscription
# (name + email + password + phone — phone is required), then:
npm run db:promote-admin -- you@example.com
```

Admin back-office: http://localhost:3000/admin

## 6. Add a product to see the storefront populated

The seed creates categories but no products. Either build one through
`/admin/products` + `/admin/products/[id]` (media manager), or insert directly:

```sql
-- as postgres (DATABASE_URL_MIGRATE) or app_service
insert into "product"(slug, category_id, name, base_price, is_active)
select 'mon-produit', id, 'Mon produit', 15000, true from "category" limit 1;
```

## Full local check (mirrors CI `quality`)

```bash
npm run verify             # lint + typecheck + build
```

## Other commands

```bash
npm run build              # next build
npm run start              # serve the production build
npm run db:generate        # create a migration from schema.ts changes
npm run db:studio          # drizzle-kit studio (browse the DB)
npm run db:policies        # re-apply RLS policies + GRANTs only
```

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `FATAL: (EAUTHQUERY) user not found` | A URL points at `anon`/`service_role` (NOLOGIN). Use `app_anon` / `app_service` / `postgres`. |
| `db:deploy` exits silently at "applying migrations…" | `DATABASE_URL_MIGRATE` unreachable/wrong. Test with `psql`. |
| Storefront shows an empty store, no error | Data readers swallow DB errors (`try/catch` → `[]`/`null`). Check the `npm run dev` terminal for `[data/*]` logs. |
| `permission denied for table X` in dev logs | `app_anon` hit a table with no `GRANT` (by design for PII). If it's a *public* table, re-run `npm run db:policies`. |
| Product reviews never show | Known bug — `FIXES.md` #1. |
