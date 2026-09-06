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

export default nextConfig
