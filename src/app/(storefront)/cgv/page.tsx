import { LegalPage } from '@/components/storefront/legal-page'

export const metadata = { title: 'Conditions générales de vente — Louisa Shopping' }

export default function CgvPage() {
  return (
    <LegalPage
      title="Conditions générales de vente"
      updated="[DATE — À COMPLÉTER]"
      sections={[
        {
          heading: 'Commande',
          body:
            'La commande est passée en ligne puis confirmée avec le vendeur sur WhatsApp. Elle n’est ferme qu’après cette confirmation. Les prix sont indiqués en francs CFA (FCFA), toutes taxes comprises.',
        },
        {
          heading: 'Paiement',
          body:
            'Aucun paiement en ligne. Le règlement s’effectue à la livraison, par Orange Money, Moov Money ou en espèces, selon ce qui est convenu sur WhatsApp.',
        },
        {
          heading: 'Livraison',
          body:
            'Livraison assurée par le vendeur dans les zones desservies (frais et délais indiqués sur chaque fiche produit). [Détails zones / délais — À COMPLÉTER]',
        },
        {
          heading: 'Retours et remboursements',
          body: '[Politique de retour — À COMPLÉTER]',
        },
        {
          heading: 'Service client',
          body:
            'Pour toute réclamation : WhatsApp +226 60 55 44 00 ou e-mail [E-mail — À COMPLÉTER].',
        },
      ]}
    />
  )
}
