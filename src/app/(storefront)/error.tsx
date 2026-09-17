'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { RefreshCw } from 'lucide-react'

/**
 * Frontière d'erreur du storefront (catalogue, fiche produit, home…).
 *
 * Elle existe pour que la couche data puisse enfin LEVER. Avant, chaque helper
 * de `src/lib/data/*` rattrapait ses erreurs à l'intérieur de sa portée
 * `'use cache'` et renvoyait un repli vide — que Next mettait en cache. Le
 * 2026-09-17, une saturation d'une minute du pooler Supabase a ainsi servi un
 * catalogue vide à tout le monde pendant une heure. Voir lib/data/resilient.ts.
 *
 * Un catalogue vide dit au visiteur « cette boutique n'a rien à vendre ».
 * Cet écran-ci dit « ça a raté, réessaie », et `reset()` refait réellement la
 * lecture puisque rien d'erroné n'a été mémorisé.
 *
 * Remarque : Next remplace `error.message` par un digest en production. C'est
 * `Sentry.captureException` ci-dessous, et `onRequestError` dans
 * src/instrumentation.ts, qui portent le détail exploitable.
 */
export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-20 text-center md:px-12">
      <span className="block h-[3px] w-8 rounded-full bg-ls-violet" aria-hidden />

      <h1 className="text-ls-h2 text-ls-gray-900">Contenu momentanément indisponible</h1>

      <p className="text-ls-body text-ls-gray-600">
        Nous n&apos;avons pas réussi à charger cette page. Ce n&apos;est pas votre
        connexion&nbsp;: réessayez, c&apos;est le plus souvent immédiat.
      </p>

      <button
        type="button"
        onClick={reset}
        className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ls-violet px-6 text-ls-body font-medium text-ls-white transition-colors duration-[var(--duration-ls-fast)] hover:bg-ls-violet-dark"
      >
        <RefreshCw size={18} strokeWidth={2} aria-hidden />
        Réessayer
      </button>

      {error.digest && (
        <p className="mt-2 text-ls-label text-ls-gray-500">
          Référence&nbsp;: <span className="font-mono">{error.digest}</span>
        </p>
      )}
    </div>
  )
}
