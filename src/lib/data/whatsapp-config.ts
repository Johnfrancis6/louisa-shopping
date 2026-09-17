import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import { eq } from 'drizzle-orm'
import { dbAnon } from '@/lib/db/client'
import { withFallback } from './resilient'
import { whatsappConfig } from '@/lib/db/schema'

export type WhatsappConfig = {
  numero: string
  lienWa: string
}

/**
 * Singleton WhatsappConfig (id = 1). `lienWa` est un lien wa.me pré-construit
 * côté Admin — à utiliser tel quel, ne jamais le reconstruire. Renvoie null
 * si non configuré.
 */
export async function getWhatsappConfig(): Promise<WhatsappConfig | null> {
  return withFallback('getWhatsappConfig', getWhatsappConfigCached, null)
}

/**
 * `null` = singleton non configuré. Le repli hors cache renvoie la même valeur,
 * mais SANS la mémoriser : le profil `hours` expire en un jour, et un `null`
 * mis en cache aurait privé le footer et le lien wa.me de la commande pendant
 * tout ce temps — alors que la vente se conclut sur WhatsApp.
 */
async function getWhatsappConfigCached(): Promise<WhatsappConfig | null> {
  'use cache'
  cacheLife('hours')
  cacheTag('whatsapp-config')

  const [row] = await dbAnon
    .select({ numero: whatsappConfig.numero, lienWa: whatsappConfig.lienWa })
    .from(whatsappConfig)
    .where(eq(whatsappConfig.id, 1))
    .limit(1)

  return row ?? null
}
