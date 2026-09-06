/**
 * Loader next/image personnalisé pour Cloudinary.
 * Injecte f_auto,q_auto (+ largeur demandée) sur toute URL Cloudinary,
 * sans repasser par le pipeline d'optimisation d'image de Netlify.
 *
 * Convention attendue : les URLs stockées en base (Media.url,
 * items_snapshot.image_url) sont des URLs Cloudinary "delivery" standard,
 * ex: https://res.cloudinary.com/<cloud_name>/image/upload/v123/produits/x.jpg
 */
export default function cloudinaryLoader({
  src,
  width,
  quality,
}: {
  src: string
  width: number
  quality?: number
}): string {
  const transformations = [
    'f_auto',
    'q_auto' + (quality ? `:${quality}` : ''),
    `w_${width}`,
    'c_limit',
  ].join(',')

  // Insère les transformations juste après /upload/
  if (src.includes('/upload/')) {
    return src.replace('/upload/', `/upload/${transformations}/`)
  }

  // Source non-Cloudinary (ne devrait pas arriver vu remotePatterns) : passthrough
  return src
}
