import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import { asc } from 'drizzle-orm'
import { dbAnon } from '@/lib/db/client'
import { withFallback } from './resilient'
import { zone } from '@/lib/db/schema'

export type Zone = {
  id: string
  nom: string
  fraisBase: number
}

/**
 * Zones de livraison — table `zone` (frais de base par zone, surchargeable
 * par produit via `product.deliveryZones`). Triée par nom croissant.
 * `[]` en cas d'erreur — les zones sont lues librement (policy
 * `zone_public_read`), une panne ici ne doit pas casser l'affichage.
 */
export async function getZones(): Promise<Zone[]> {
  return withFallback('getZones', getZonesCached, [])
}

async function getZonesCached(): Promise<Zone[]> {
  'use cache'
  cacheLife('hours')
  cacheTag('zones')

  return dbAnon
    .select({ id: zone.id, nom: zone.nom, fraisBase: zone.fraisBase })
    .from(zone)
    .orderBy(asc(zone.nom))
}
