import { LegalPage } from '@/components/storefront/legal-page'

export const metadata = { title: 'Mentions légales — Louisa Shopping' }

export default function MentionsLegalesPage() {
  return (
    <LegalPage
      title="Mentions légales"
      updated="[DATE — À COMPLÉTER]"
      sections={[
        {
          heading: 'Éditeur du site',
          body:
            'Louisa Shopping\n[Raison sociale / statut — À COMPLÉTER]\n[Adresse — À COMPLÉTER], Burkina Faso\nTéléphone / WhatsApp : +226 60 55 44 00\nE-mail : [E-mail — À COMPLÉTER]\n[Numéro RCCM / IFU — À COMPLÉTER]',
        },
        {
          heading: 'Directeur de la publication',
          body: '[Nom — À COMPLÉTER]',
        },
        {
          heading: 'Hébergement',
          body:
            'Site hébergé par Netlify, Inc. — 512 2nd Street, Suite 200, San Francisco, CA 94107, États-Unis.',
        },
        {
          heading: 'Propriété intellectuelle',
          body:
            'L’ensemble des contenus de ce site (textes, visuels, logo) est la propriété de Louisa Shopping, sauf mention contraire. Toute reproduction sans autorisation est interdite.',
        },
      ]}
    />
  )
}
