// Chargement explicite des variables d'environnement — drizzle-kit ne lit
// PAS .env.local par défaut (convention Next.js), seulement .env. On force
// le chargement des deux pour couvrir les deux cas côté dev.
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import type { Config } from "drizzle-kit";

// DDL / migrations : connexion `postgres` (login + droits DDL).
// PAS `service_role` / `anon` — ce sont des rôles NOLOGIN chez Supabase, on ne
// peut pas ouvrir de connexion Postgres directe avec (FATAL "user not found").
// `DATABASE_URL_MIGRATE` est la variable dédiée ; `DATABASE_URL_ADMIN` reste un
// fallback historique.
const migrateUrl =
  process.env.DATABASE_URL_MIGRATE ?? process.env.DATABASE_URL_ADMIN;
if (!migrateUrl) {
  throw new Error(
    "[drizzle.config.ts] DATABASE_URL_MIGRATE (ou DATABASE_URL_ADMIN) " +
      "manquante — vérifiez qu'elle est bien définie dans .env ou .env.local."
  );
}

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Migrations générées/appliquées avec la connexion `postgres` (droits DDL).
    url: migrateUrl,
  },
  strict: true,
  verbose: true,
} satisfies Config;