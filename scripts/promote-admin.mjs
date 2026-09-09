/**
 * scripts/promote-admin.mjs
 * Promeut un utilisateur existant au rôle `admin` (aucun endpoint applicatif
 * ne le fait — promotion hors-bande volontaire).
 *
 *   npm run db:promote-admin -- user@example.com
 */
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const email = process.argv[2];
if (!email) {
  console.error("Usage: npm run db:promote-admin -- <email>");
  process.exit(1);
}

// Connexion `postgres` (DATABASE_URL_MIGRATE), pas `dbAdmin`/app_service :
// script opérateur hors-bande, même contexte que db:deploy/db:seed. Et de
// toute façon `service_role` est NOLOGIN chez Supabase — seul `postgres`
// peut ouvrir une connexion directe pour un script CLI.
const url = process.env.DATABASE_URL_MIGRATE ?? process.env.DATABASE_URL_ADMIN;
if (!url) {
  console.error("[promote-admin] DATABASE_URL_MIGRATE (ou DATABASE_URL_ADMIN) manquante.");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1 });
try {
  const rows = await sql`
    update "user" set "role" = 'admin', "updated_at" = now()
    where lower("email") = lower(${email})
    returning "id", "email", "role"
  `;
  if (rows.length === 0) {
    console.error(`[promote-admin] aucun utilisateur avec l'email ${email}`);
    process.exitCode = 1;
  } else {
    console.log(`[promote-admin] ${rows[0].email} → role=${rows[0].role} ✓`);
  }
} catch (err) {
  console.error("[promote-admin] échec :", err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
