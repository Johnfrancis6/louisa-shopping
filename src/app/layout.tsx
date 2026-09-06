import type { Metadata } from 'next'
import './globals.css'

// PLACEHOLDER — squelette minimal pour valider le pipeline CI/CD.
// À remplacer par l'agent UI (src/app/(storefront)/layout.tsx réel).
export const metadata: Metadata = {
  title: 'Louisa Shopping',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
