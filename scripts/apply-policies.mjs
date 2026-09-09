/**
 * scripts/apply-policies.mjs
 * Applique supabase/policies.sql sur la base (connexion admin/DDL).
 * Idempotent — peut être relancé à chaque déploiement après les migrations.
 *
 *   npm run db:policies
 *
 * drizzle-kit ne gère PAS les policies RLS : ce script comble ce trou pour
 * qu'elles ne dépendent plus d'une exécution manuelle dans le dashboard.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = resolve(__dirname, "../supabase/policies.sql");

const url = process.env.DATABASE_URL_ADMIN;
if (!url) {
  console.error("[apply-policies] DATABASE_URL_ADMIN manquante.");
  process.exit(1);
}

const sqlText = readFileSync(sqlPath, "utf8");
const sql = postgres(url, { prepare: false, max: 1 });

try {
  await sql.unsafe(sqlText);
  console.log("[apply-policies] policies.sql appliqué ✓");
} catch (err) {
  console.error("[apply-policies] échec :", err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
