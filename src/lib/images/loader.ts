/**
 * Loader next/image unifié — ImageKit (cible) + Cloudinary (héritage).
 *
 * ImageKit optimise à la livraison : on court-circuite le pipeline
 * d'optimisation d'image de Next/Netlify (next.config.ts
 * `images.loader: 'custom'`) et on se contente de réécrire l'URL.
 *
 * ⚠️ Ce fichier part dans le bundle CLIENT : pas d'import serveur, pas de
 * `process.env` autre que `NEXT_PUBLIC_*`, et rien d'asynchrone.
 *
 * ImageKit — transformations en PARAMÈTRE DE REQUÊTE :
 *   https://ik.imagekit.io/<id>/dossier/photo.jpg
 *   → …/photo.jpg?tr=w-640,q-82,f-auto,c-at_max
 * (`tr:` en segment de chemin marche aussi, mais le paramètre évite d'avoir à
 * charcuter le chemin — l'URL stockée en base reste utilisable telle quelle.)
 *
 * `c-at_max` = jamais d'agrandissement au-delà de la source.
 * `f-auto`   = AVIF/WebP selon le navigateur.
 *
 * Cloudinary (lignes déjà en base, seed de démo) :
 *   https://res.cloudinary.com/<cloud>/image/upload/<id>.jpg
 *   → .../upload/f_auto,q_auto,w_640,c_limit/<id>.jpg
 */

const IMAGEKIT_HOST = 'ik.imagekit.io'

/** Qualité par défaut quand next/image n'en impose pas. */
const DEFAULT_QUALITY = 82

export default function imageLoader({
  src,
  width,
  quality,
}: {
  src: string
  width: number
  quality?: number
}): string {
  // ── ImageKit ─────────────────────────────────────────────────────────────
  if (src.includes(IMAGEKIT_HOST)) {
    const tr = [
      `w-${width}`,
      `q-${quality ?? DEFAULT_QUALITY}`,
      'f-auto',
      'c-at_max',
    ].join(',')

    // Construit à la main plutôt qu'avec URLSearchParams : celui-ci
    // encoderait les virgules en %2C et alourdirait l'URL pour rien.
    const [base, query = ''] = src.split('?')
    const others = query
      .split('&')
      .filter((part) => part && !part.startsWith('tr='))
      .join('&')

    return `${base}?${[`tr=${tr}`, others].filter(Boolean).join('&')}`
  }

  // ── Cloudinary (héritage) ────────────────────────────────────────────────
  if (src.includes('/upload/')) {
    const transformations = [
      'f_auto',
      'q_auto' + (quality ? `:${quality}` : ''),
      `w_${width}`,
      'c_limit',
    ].join(',')
    return src.replace('/upload/', `/upload/${transformations}/`)
  }

  // Asset local ou source inconnue : passthrough.
  return src
}
