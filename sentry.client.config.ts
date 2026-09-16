import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Plan free = 5 000 erreurs/mois, 1 utilisateur (rapport-faisabilite §3) —
  // volumétrie très large pour ce catalogue (<100 SKU, trafic initial faible).
  // Sampling conservateur pour rester loin du quota, pas pour des raisons
  // de coût immédiat mais pour garder de la marge en cas de pic de trafic.
  tracesSampleRate: 0.2,

  // Replay NON activé : l'intégration n'est pas enregistrée, donc les taux
  // d'échantillonnage ci-dessous n'avaient aucun effet — ils laissaient juste
  // croire qu'un replay tournait. Retirés. Son code est en plus exclu du bundle
  // par `bundleSizeOptimizations` (next.config.ts).
  //
  // Pour l'activer ponctuellement : ajouter `integrations: [Sentry.replayIntegration()]`
  // ET retirer les `excludeReplay*` de next.config.ts, sinon le replay sera
  // enregistré mais amputé. Attention au quota (50 replays/mois en free tier).
})
