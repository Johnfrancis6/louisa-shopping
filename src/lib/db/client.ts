/**
 * lib/db/client.ts
 * Deux exports nommés — décision figée contrat v2.3 section E :
 * "dbAnon / dbAdmin — deux exports nommés : RLS Supabase, évite les fuites
 * silencieuses".
 *
 * SERVEUR UNIQUEMENT. Ne jamais importer ce module depuis un composant
 * client ("use client") ni l'exposer via une route publique brute.
 *
 * - dbAnon  : connexion via le rôle Postgres `anon`/`authenticated` de
 *             Supabase. RLS active. Utilisé par le storefront
 *             (components/storefront/, app/(storefront)/, lib/actions/
 *             côté lecture publique).
 * - dbAdmin : connexion via le rôle `service_role` (clé secrète, jamais
 *             exposée au bundle client). Bypass RLS. Réservé à
 *             app/(admin)/, lib/actions/ (mutations StockLedger, validation
 *             commandes) — voir frontières de responsabilité contrat D.
 *
 * Note d'implémentation (dépendance Auth — à valider avec l'agent Auth) :
 * pour que les policies RLS scoping "propriétaire" (Order, Wishlist,
 * Customer — voir supabase/policies.sql) fonctionnent avec `auth.uid()`,
 * la session Postgres utilisée par dbAnon doit porter le claim JWT de
 * l'utilisateur connecté (Better Auth) sur chaque requête, via :
 *   select set_config('request.jwt.claims', <jwt_json>, true);
 * exécuté en tout début de transaction. Ce pont Better Auth -> claim
 * Postgres n'est pas du ressort de l'agent DB (lib/actions/, lib/auth/) —
 * signalé ici comme point ouvert, pas résolu silencieusement.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[lib/db/client] Variable d'environnement manquante : ${name}`
    );
  }
  return value;
}

// Connexion "storefront" — rôle Postgres restreint, RLS appliquée.
const anonConnectionString = requireEnv("DATABASE_URL_ANON");
// Connexion "admin / logique métier" — rôle service_role, RLS bypass.
const adminConnectionString = requireEnv("DATABASE_URL_ADMIN");

const anonClient = postgres(anonConnectionString, {
  prepare: false, // requis avec le pooler Supabase (Supavisor / PgBouncer transaction mode)
  max: 10,
});

const adminClient = postgres(adminConnectionString, {
  prepare: false,
  max: 10,
});

export const dbAnon = drizzle(anonClient, { schema });
export const dbAdmin = drizzle(adminClient, { schema });

export type DbAnon = typeof dbAnon;
export type DbAdmin = typeof dbAdmin;

// Types Drizzle partagés (convention imposée — voir regles-coordination §6) :
// tout agent qui a besoin d'un type de ligne importe depuis ce module,
// jamais en redéfinissant un type dupliqué localement.
export * from "./schema";