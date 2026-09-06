import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.2,

  // Aucune donnée client (téléphone, adresse) ne doit remonter dans les
  // breadcrumbs/contexte Sentry — Customer contient phone/email/address_json
  // (contrat §B). À respecter côté agent Logique métier lors des
  // Sentry.captureException/setContext manuels.
  sendDefaultPii: false,
})
