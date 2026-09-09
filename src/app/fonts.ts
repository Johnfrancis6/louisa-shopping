// src/app/fonts.ts
import { Inter, Playfair_Display } from 'next/font/google'

// ui-reference.md §1.2 : charger uniquement les weights 400 et 500 pour Inter
// (pas de 600/700 — trop lourd sur mobile / réseau lent BF).
export const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-inter',
  display: 'swap',
})

// Logo uniquement — weight 500, jamais utilisé ailleurs dans le storefront.
export const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['500'],
  variable: '--font-playfair',
  display: 'swap',
})