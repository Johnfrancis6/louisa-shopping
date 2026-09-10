// src/components/storefront/layout/logo.tsx
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import logo from './logo.png'

/**
 * Logo Louisa Shopping — `./logo.png` importé en statique (Next connaît les
 * dimensions intrinsèques → aucun CLS).
 *
 * ⚠️ Taille = la hauteur `h-[…]`. Tailwind n'a pas de `h-13` / `h-15` : utiliser
 * un pas valide (`h-10`, `h-11`, `h-12`, `h-14`) ou une valeur arbitraire
 * `h-[44px]`. Réglage par défaut ci-dessous (navbar + drawer) ; le footer
 * surcharge via `className`. La navbar fait 56px de haut : garder le logo ≤ 48px.
 */
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
        src={logo}
        alt="Louisa Shopping"
        priority={priority}
        sizes="120px"
        className={cn('h-11 w-auto max-w-[140px] object-contain', className)}
      />
    </Link>
  )
}
