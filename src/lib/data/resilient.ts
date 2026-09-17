import 'server-only'
import * as Sentry from '@sentry/nextjs'

/**
 * src/lib/data/resilient.ts
 *
 * ┌─ LA RÈGLE ────────────────────────────────────────────────────────────────┐
 * │ Une fonction `'use cache'` ne doit JAMAIS retourner une valeur dégradée.  │
 * │ Sa valeur de retour EST l'entrée de cache : un repli vide renvoyé depuis  │
 * │ un `catch` interne est écrit dans le cache durable et resservi à tout le  │
 * │ monde jusqu'à son `expire`.                                              │
 * └───────────────────────────────────────────────────────────────────────────┘
 *
 * Ce n'est pas théorique. Le 2026-09-17 à 20:57, une saturation du pooler
 * Supabase (« (EMAXCONNSESSION) max clients reached in session mode - max
 * clients are limited to pool_size: 15 », cf. lib/db/client.ts) a fait échouer
 * cinq lectures publiques en une minute. Chaque helper a rattrapé l'erreur
 * *à l'intérieur* de sa portée cachée et renvoyé son repli vide. Next a mis ce
 * vide en cache. Résultat : catalogue vide, grille de catégories vide, pour
 * TOUS les visiteurs, pendant une heure pleine — la valeur de `expire` du
 * profil `minutes`. La base, elle, était joignable depuis la deuxième seconde.
 *
 * Le symptôme côté client — « la page est vide, je rafraîchis plusieurs fois et
 * ça finit par revenir » — n'était pas de l'intermittence réseau : c'était
 * l'attente de l'expiration d'une entrée empoisonnée.
 *
 * D'où les deux formes ci-dessous. Dans les deux cas le `try/catch` est
 * DEHORS de la portée `'use cache'`, donc le repli ne vaut que pour la requête
 * en cours et la suivante retente vraiment.
 *
 *   - `withFallback` — lecture ACCESSOIRE (compteurs, facettes, badge panier,
 *     contenu éditorial doublé d'un repli codé en dur). Une panne dégrade
 *     l'affichage, elle ne doit pas coûter la page.
 *
 *   - Lecture CRITIQUE (grille catalogue, fiche produit, catégories) : pas de
 *     repli du tout. On laisse remonter, la frontière d'erreur du storefront
 *     (`src/app/(storefront)/error.tsx`) affiche « réessayer ». Un catalogue
 *     vide ment au visiteur — il lui dit que la boutique n'a rien à vendre —
 *     là où une erreur explicite lui propose l'action qui marche.
 */

/**
 * Remonte une erreur de lecture à Sentry ET au journal de la fonction.
 *
 * Les `catch` de cette couche ne faisaient que `console.error`. Les cinq FATAL
 * du 2026-09-17 ne sont donc apparues nulle part ailleurs que dans les logs
 * Netlify, qu'il faut penser à aller lire : aucune alerte, aucun ticket, une
 * heure de catalogue vide en silence.
 */
export function reportDataError(label: string, err: unknown): void {
  console.error(`[data] ${label}`, err)
  Sentry.captureException(err, {
    tags: { area: 'data-layer', helper: label },
  })
}

/**
 * Exécute une lecture cachée et, si elle échoue, renvoie `fallback` POUR CETTE
 * REQUÊTE UNIQUEMENT.
 *
 * À appeler depuis un wrapper non caché : `read` est la fonction `'use cache'`,
 * qui doit lever librement. Comme l'exception traverse la frontière du cache,
 * Next ne mémorise rien et la requête suivante refait la lecture.
 *
 * @param label   identifiant du helper, pour le journal et le tag Sentry
 * @param read    la fonction `'use cache'` — elle lève, elle ne rattrape pas
 * @param fallback valeur dégradée, jamais mise en cache
 */
export async function withFallback<T>(
  label: string,
  read: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await read()
  } catch (err) {
    reportDataError(label, err)
    return fallback
  }
}
