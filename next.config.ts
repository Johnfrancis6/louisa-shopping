import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next'

/**
 * Louisa Shopping — next.config.ts
 * Agent DevOps — conforme à 01-architecture/contrat-technique-v2.3.md (+addendum v2.4)
 *
 * Écart signalé (voir devops-reference.md) : le contrat mentionne encore
 * des optimisations "Vercel" (section C/D) — non applicables, hébergement = Netlify.
 */
const nextConfig: NextConfig = {
  // 'use cache' (fiches produit, contrat §C) — flag léger Next 15,
  // ne pas confondre avec dynamicIO (non nécessaire ici, pas de besoin de
  // désactiver le pré-rendu global).
  experimental: {
    useCache: true,
  },

  images: {
    // Les médias produits sont servis par Cloudinary avec f_auto,q_auto déjà
    // appliqué à la source (voir src/lib/cloudinary/loader.ts). On bypasse
    // le pipeline d'optimisation d'image de Next/Netlify pour ces URLs :
    // double-transformation inutile et évite de consommer un quota d'images
    // Netlify séparé du quota de bande passante déjà sous surveillance.
    loader: 'custom',
    loaderFile: './src/lib/cloudinary/loader.ts',
    // Fallback pour toute image non-Cloudinary (og:image générées, assets statiques)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },

  // Aucune fonction serverless dupliquée : le seul point d'entrée serveur
  // additionnel est /api/og (agent UI). Pas de proxy/rewrite serveur ajouté ici.
  async headers() {
    return [
      {
        // Tunnel checkout exclu du cache (contrat §A) — défense en profondeur
        // en plus de la config PWA côté UI.
        source: '/checkout/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
 // For all available options, see:
 // https://www.npmjs.com/package/@sentry/webpack-plugin#options

 org: "cilicone-voice-c3",

 project: "louisa-shopping-monitoring",

 // Only print logs for uploading source maps in CI
 silent: !process.env.CI,

 // For all available options, see:
 // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

 // Upload a larger set of source maps for prettier stack traces (increases build time)
 widenClientFileUpload: true,

 // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
 // This can increase your server load as well as your hosting bill.
 // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
 // side errors will fail.
 tunnelRoute: "/monitoring",

 webpack: {
   // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
   // See the following for more information:
   // https://docs.sentry.io/product/crons/
   // https://vercel.com/docs/cron-jobs
   automaticVercelMonitors: false,

   // Tree-shaking options for reducing bundle size
   treeshake: {
     // Automatically tree-shake Sentry logger statements to reduce bundle size
     removeDebugLogging: true,
   },
 },
});
