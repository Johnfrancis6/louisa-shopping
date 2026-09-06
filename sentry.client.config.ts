import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Plan free = 5 000 erreurs/mois, 1 utilisateur (rapport-faisabilite §3) —
  // volumétrie très large pour ce catalogue (<100 SKU, trafic initial faible).
  // Sampling conservateur pour rester loin du quota, pas pour des raisons
  // de coût immédiat mais pour garder de la marge en cas de pic de trafic.
  tracesSampleRate: 0.2,

  // Replays désactivés par défaut : consomment le quota (50 replays/mois en
  // free tier) très vite. À activer ponctuellement pour du debug ciblé,
  // pas en continu.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.1,

  // integrations: [
  //   Sentry.replayIntegration(),
  // ],
})
