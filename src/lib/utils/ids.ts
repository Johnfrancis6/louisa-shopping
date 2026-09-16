/**
 * src/lib/utils/ids.ts
 * Garde d'entrée pour toute colonne `uuid` Postgres (contrat T7 §1).
 *
 * Passer une chaîne non-UUID à `eq(col, value)` sur une colonne `uuid` fait
 * lever à Postgres l'erreur 22P02 (invalid input syntax for type uuid), qui
 * remonte comme une 500 non catégorisée (bruit Sentry) au lieu d'un simple
 * « introuvable ». On filtre donc AVANT toute requête.
 *
 * Regex volontairement permissive sur le nibble de version (v1 à v8, plus le
 * nil UUID tout-zéro) : l'objectif est d'écarter ce que Postgres refusera de
 * toute façon, pas de valider une version RFC précise.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}
