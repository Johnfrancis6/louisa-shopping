import { LegalPage } from '@/components/storefront/legal-page'

export const metadata = { title: 'Politique de confidentialité — Louisa Shopping' }

export default function ConfidentialitePage() {
  return (
    <LegalPage
      title="Politique de confidentialité"
      updated="[DATE — À COMPLÉTER]"
      sections={[
        {
          heading: 'Données collectées',
          body:
            'Lors de la création d’un compte et d’une commande : nom, numéro de téléphone, e-mail, adresse de livraison. Ces informations servent uniquement à traiter et livrer vos commandes.',
        },
        {
          heading: 'Utilisation',
          body:
            'Vos données ne sont ni vendues ni cédées à des tiers. Elles sont partagées avec le vendeur pour la confirmation WhatsApp et la livraison.',
        },
        {
          heading: 'Conservation',
          body: '[Durée de conservation — À COMPLÉTER]',
        },
        {
          heading: 'Vos droits',
          body:
            'Vous pouvez demander l’accès, la rectification ou la suppression de vos données en écrivant à [E-mail — À COMPLÉTER] ou via WhatsApp au +226 60 55 44 00.',
        },
        {
          heading: 'Cookies',
          body:
            'Le site utilise des cookies strictement nécessaires (session de connexion, panier). Aucun cookie publicitaire.',
        },
      ]}
    />
  )
}
