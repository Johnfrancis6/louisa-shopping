import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * tailwind-merge ne connaît que les classes Tailwind natives. Nos utilitaires
 * typo (`text-ls-h1`, `text-ls-body`, …) portent le préfixe `text-`, il les
 * rangeait donc avec les COULEURS (`text-ls-gray-500`) et n'en gardait qu'une :
 *
 *   cn('text-ls-label', 'text-ls-gray-500')  →  'text-ls-gray-500'
 *
 * La taille disparaissait silencieusement. Le défaut dormait tant que les
 * utilitaires typo étaient eux-mêmes inertes (cf. docs/design/typography.md,
 * piège nº 2) ; il est devenu visible dès qu'ils ont été réparés. On les
 * déclare donc dans le groupe `font-size`, où ils cohabitent avec une couleur
 * et s'excluent entre eux.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        "text-ls-h1",
        "text-ls-h2",
        "text-ls-body",
        "text-ls-label",
        "text-ls-price",
        "text-ls-price-old",
      ],
    },
  },
})

/**
 * Fusionne des classes conditionnelles (clsx) puis dédoublonne les classes
 * Tailwind en conflit (tailwind-merge). Helper standard shadcn/ui — utilisé
 * par tous les composants de src/components/ui/.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
