import { defineConfig } from 'drizzle-kit'

/**
 * Louisa Shopping — drizzle.config.ts
 *
 * Conforme à 07-agent-db/db-reference.md §1 (structure de dossiers imposée) :
 *   src/lib/db/schema.ts   → schéma (tables, enums, relations)
 *   src/lib/db/client.ts   → dbAnon / dbAdmin
 *   drizzle/               → migrations générées (0000_init.sql, meta/)
 *   supabase/policies.sql  → RLS, hors périmètre drizzle-kit
 *
 * Note de lecture (à valider) : le document db-reference.md perd son
 * indentation à l'export texte ; l'emplacement exact de drizzle/ et
 * drizzle.config.ts (racine du repo vs sous src/) est déduit ici selon la
 * convention drizzle-kit standard. Signalé en "Écart détecté" dans
 * devops-reference.md — à confirmer par l'agent DB si une autre
 * arborescence était voulue.
 */
export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL_ADMIN!,
  },
  // Connexion directe (migrations) — distincte des clients applicatifs
  // dbAnon/dbAdmin (RLS) définis dans src/lib/db/client.ts.
  strict: true,
  verbose: true,
})
