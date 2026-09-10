// src/components/storefront/logo.tsx
import Link from 'next/link'
import { playfairDisplay } from '@/app/fonts'

/**
 * Seul composant autorisé à utiliser Playfair Display (ui-reference.md §1.2).
 * Couleur : encre (--color-ls-gray-900). Storefront monochrome (audit design 2026-09),
 * 1 seul token à changer le jour où la couleur finale du logo est tranchée.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`${playfairDisplay.className} text-[20px] font-medium text-ls-gray-900 ${className ?? ''}`}
      aria-label="Louisa Shopping — accueil"
    >
      Louisa
    </Link>
  )
}