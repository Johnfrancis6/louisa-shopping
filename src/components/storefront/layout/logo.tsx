// src/components/storefront/layout/logo.tsx
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'

/**
 * Logo Louisa Shopping.
 *
 * Servi par Cloudinary comme tous les médias : le loader next/image
 * (`next.config.ts`) injecte `f_auto,q_auto,w_…` → ~4 KB WebP au lieu du PNG
 * source de 440 KB. Master : `louisa-shopping/brand/logo` (source dans l'historique
 * git : `git show <commit>:src/components/storefront/layout/logo.png`).
 *
 * ⚠️ Taille = la hauteur `h-[…]`. Tailwind n'a pas de `h-13` / `h-15` : utiliser
 * un pas valide (`h-10`, `h-11`, `h-12`, `h-14`) ou `h-[44px]`. La navbar fait
 * 56px — garder le logo ≤ 48px. Le footer surcharge via `className`.
 */
const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? 'r9iswf0z'
const LOGO_URL = `https://res.cloudinary.com/${CLOUD}/image/upload/v1789031856/louisa-shopping/brand/logo.png`
const LOGO_W = 938
const LOGO_H = 1024

export function Logo({
  className,
  priority = false,
}: {
  className?: string
  priority?: boolean
}) {
  return (
    <Link
      href="/"
      aria-label="Louisa Shopping — accueil"
      className="inline-flex shrink-0 items-center"
    >
      <Image
        src={LOGO_URL}
        alt="Louisa Shopping"
        width={LOGO_W}
        height={LOGO_H}
        priority={priority}
        sizes="120px"
        className={cn('h-11 w-auto max-w-[140px] object-contain', className)}
      />
    </Link>
  )
}
