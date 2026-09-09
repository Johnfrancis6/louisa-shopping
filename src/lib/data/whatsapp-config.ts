import { cacheLife, cacheTag } from 'next/cache'
import { eq } from 'drizzle-orm'
import { dbAnon } from '@/lib/db/client'
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
  'use cache'
  cacheLife('hours')
  cacheTag('whatsapp-config')

  try {
    const [row] = await dbAnon
      .select({ numero: whatsappConfig.numero, lienWa: whatsappConfig.lienWa })
      .from(whatsappConfig)
      .where(eq(whatsappConfig.id, 1))
      .limit(1)

    return row ?? null
  } catch (err) {
    console.error('[data/whatsapp-config] getWhatsappConfig', err)
    return null
  }
}
