import "server-only";

/**
 * src/lib/db/client.ts
 * Deux exports nommés — décision figée contrat v2.3 section E :
 * "dbAnon / dbAdmin — deux exports nommés : RLS Supabase, évite les fuites
 * silencieuses".
 *
 * SERVEUR UNIQUEMENT. Ne jamais importer ce module depuis un composant
 * client ("use client") ni l'exposer via une route publique brute.
 *
 * - dbAnon  : connexion via `app_anon` (rôle LOGIN dédié, `in role anon`,
 *             PAS de BYPASSRLS). RLS active, **lecture publique uniquement**.
 * - dbAdmin : connexion via `app_service` (rôle LOGIN dédié, `in role
 *             service_role`, BYPASSRLS). Accès complet, RLS ignorée.
 *
 * `anon` / `service_role` de Supabase sont NOLOGIN : on ne peut pas s'y
 * connecter directement, d'où les deux rôles applicatifs. GRANT niveau table
 * dans supabase/policies.sql, doc dans .env.example. Les scripts opérateurs
 * (migrations, seed, promote-admin) passent par `postgres` / DATABASE_URL_MIGRATE,
 * jamais par ces deux clients.
 *
 * Lazy initialization : requireEnv() et postgres() ne s'exécutent qu'au
 * premier appel effectif. Évite que Next.js plante au prerender/build
 * quand les variables d'environnement ne sont pas encore injectées.
 *
 * Stratégie d'autorisation (contrat v2.5 section C) : PAS de pont RLS
 * auth.uid() <-> Better Auth. dbAnon = lecture publique uniquement ; toute
 * donnée nominative (Customer, Order, Wishlist...) passe par dbAdmin +
 * vérification explicite de propriété en Server Action.
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

// ── Lazy singletons ──────────────────────────────────────────────────────

let _anonClient: postgres.Sql | null = null;
let _adminClient: postgres.Sql | null = null;
let _dbAnon: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _dbAdmin: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Réglages communs aux deux pools. Contexte : Netlify/OpenNext = AWS Lambda.
 *
 * `max` — une instance Lambda ne traite qu'UNE requête à la fois : dix
 * connexions par client n'ajoutent aucun parallélisme utile, elles ne font que
 * réserver des slots dans le pooler. Trois suffisent aux `Promise.all` de la
 * couche data (cf. hydrate() dans lib/data/products.ts) sans les sérialiser.
 *
 * `idle_timeout` — LE réglage qui manquait. postgres-js garde par défaut ses
 * connexions ouvertes indéfiniment ; une instance Lambda gelée entre deux
 * requêtes continuait donc de tenir ses slots. Le 2026-09-17, avec max: 10 sur
 * deux clients (dbAnon + dbAdmin) = 20 connexions par instance, ça a saturé le
 * pooler : « (EMAXCONNSESSION) max clients reached in session mode - max
 * clients are limited to pool_size: 15 ». Toutes les lectures publiques ont
 * échoué pendant une minute, et le catalogue est resté vide une heure (voir la
 * note sur la mise en cache des échecs dans lib/data/resilient.ts).
 *
 * `connect_timeout` — échouer en 10 s plutôt que pendre 30 s (le défaut) sur un
 * pooler saturé : la requête a une chance de finir dans le budget de la Lambda.
 *
 * ⚠️ Ces réglages supposent les URL sur le pooler en mode TRANSACTION
 * (port 6543), pas en mode session (5432) — voir .env.example.
 */
const POOL_OPTIONS = {
  prepare: false, // requis Supavisor / PgBouncer transaction mode
  max: 3,
  idle_timeout: 20,
  connect_timeout: 10,
} as const;

function getAnonClient(): postgres.Sql {
  if (!_anonClient) {
    _anonClient = postgres(requireEnv("DATABASE_URL_ANON"), POOL_OPTIONS);
  }
  return _anonClient;
}

function getAdminClient(): postgres.Sql {
  if (!_adminClient) {
    _adminClient = postgres(requireEnv("DATABASE_URL_ADMIN"), POOL_OPTIONS);
  }
  return _adminClient;
}

// ── Exports nommés (contrat v2.3 §E) ──────────────────────────────────────
// Proxy : initialise drizzle au premier vrai appel DB (jamais au module-load).
// IMPORTANT : bind() sur les méthodes — sans ça, `dbAdmin.select()` exécute
// la méthode avec this = le Proxy (pas l'instance drizzle réelle), ce qui
// casse en interne (this.session undefined, etc.) dans drizzle-orm.

export const dbAnon = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    if (!_dbAnon) _dbAnon = drizzle(getAnonClient(), { schema });
    const value = (_dbAnon as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? value.bind(_dbAnon) : value;
  },
});

export const dbAdmin = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    if (!_dbAdmin) _dbAdmin = drizzle(getAdminClient(), { schema });
    const value = (_dbAdmin as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? value.bind(_dbAdmin) : value;
  },
});

export type DbAnon = typeof dbAnon;
export type DbAdmin = typeof dbAdmin;

// Types Drizzle partagés (convention imposée — voir regles-coordination §6)
export * from "./schema";