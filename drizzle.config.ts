// Chargement explicite des variables d'environnement — drizzle-kit ne lit
// PAS .env.local par défaut (convention Next.js), seulement .env. On force
// le chargement des deux pour couvrir les deux cas côté dev.
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import type { Config } from "drizzle-kit";

const databaseUrlAdmin = process.env.DATABASE_URL_ADMIN;
if (!databaseUrlAdmin) {
  throw new Error(
    "[drizzle.config.ts] DATABASE_URL_ADMIN manquante — vérifiez qu'elle " +
      "est bien définie dans .env ou .env.local à la racine du projet."
  );
}

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Migrations générées/appliquées avec la connexion admin (bypass RLS,
    // droits DDL). Ne jamais utiliser la connexion anon ici.
    url: databaseUrlAdmin,
  },
  strict: true,
  verbose: true,
} satisfies Config;