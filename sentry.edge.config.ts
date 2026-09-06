import * as Sentry from '@sentry/nextjs'

// Couvre middleware.ts (admin-guard + traffic-context, contrat §D) —
// sans cette init, les erreurs levées dans le middleware ne remontent pas.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.2,
  sendDefaultPii: false,
})
