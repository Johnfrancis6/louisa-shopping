// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { inter, playfairDisplay } from './fonts'
import { Toaster } from '@/components/ui/sonner'

export const metadata: Metadata = {
  title: 'Louisa Shopping',
  description: 'Catalogue Louisa Shopping — Burkina Faso',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover', // nécessaire pour env(safe-area-inset-bottom)
}

/**
 * Root layout — uniquement <html>/<body>, polices et providers globaux.
 * La chrome (navbar, bottom nav) appartient aux layouts de groupe :
 *  - (storefront)/layout.tsx : navbar + bottom nav
 *  - (admin)/layout.tsx      : chrome admin (à venir)
 * Le tunnel checkout vivra dans son propre groupe, sans navbar.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${inter.variable} ${playfairDisplay.variable}`}>
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
