// src/components/storefront/logo.tsx
import Link from 'next/link'
import { playfairDisplay } from '@/app/fonts'

/**
 * Seul composant autorisé à utiliser Playfair Display (ui-reference.md §1.2).
 * Couleur --ls-accent en placeholder — "À confirmer" côté ui-reference.md,
 * 1 seul token à changer le jour où la couleur finale du logo est tranchée.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`${playfairDisplay.className} text-[20px] font-medium text-ls-accent ${className ?? ''}`}
      aria-label="Louisa Shopping — accueil"
    >
      Louisa
    </Link>
  )
}