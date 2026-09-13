import { cacheLife, cacheTag } from 'next/cache'
import { and, asc, eq } from 'drizzle-orm'
import { dbAnon } from '@/lib/db/client'
import { homeBlock } from '@/lib/db/schema'

/**
 * src/lib/data/home.ts
 * Contenu éditorial de la home (hero, carrousel, actualités, illustrations
 * du parcours). Lecture publique via dbAnon — policy `home_block_public_read`
 * ne laisse passer que visible = true.
 *
 * Busté par `updateTag('home')` depuis src/lib/actions/admin/home.ts.
 * `cacheLife('hours')` : ce contenu bouge rarement, et toute écriture admin
 * invalide explicitement.
 */

export type HomeSlot = 'hero' | 'rail' | 'news' | 'process'

export type HomeBlockView = {
  id: string
  eyebrow: string | null
  title: string
  body: string | null
  ctaLabel: string | null
  href: string | null
  imageUrl: string | null
}

export async function getHomeBlocks(slot: HomeSlot): Promise<HomeBlockView[]> {
  'use cache'
  cacheLife('hours')
  cacheTag('home', `home:${slot}`)

  try {
    return await dbAnon
      .select({
        id: homeBlock.id,
        eyebrow: homeBlock.eyebrow,
        title: homeBlock.title,
        body: homeBlock.body,
        ctaLabel: homeBlock.ctaLabel,
        href: homeBlock.href,
        imageUrl: homeBlock.imageUrl,
      })
      .from(homeBlock)
      .where(and(eq(homeBlock.slot, slot), eq(homeBlock.visible, true)))
      .orderBy(asc(homeBlock.position), asc(homeBlock.createdAt))
  } catch (err) {
    // Table absente (migration pas encore appliquée) ou base injoignable : la
    // home doit rendre quand même, sur son contenu de repli.
    console.error(`[data/home] getHomeBlocks(${slot})`, err)
    return []
  }
}

/** Bannière de la home. Le premier bloc `hero` visible, par position. */
export async function getHeroBlock(): Promise<HomeBlockView | null> {
  const [hero] = await getHomeBlocks('hero')
  return hero ?? null
}
