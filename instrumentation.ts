import * as Sentry from '@sentry/nextjs'

// instrumentation.ts activé par défaut en Next.js 15.3+ (pas de flag
// experimental.instrumentationHook nécessaire — vérifié 09/2026).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export const onRequestError = Sentry.captureRequestError
