// src/components/storefront/reassurance.tsx
import { Truck, ShieldCheck, Wallet, MessageCircle } from 'lucide-react'

/**
 * 4 items mock, éditables ensuite par l'utilisateur (demande initiale).
 * Choisis pour refléter le vrai modèle métier (COD/Mobile Money vitrine,
 * closing WhatsApp) plutôt que des génériques e-commerce interchangeables —
 * mais restent des textes à valider, pas des décisions actées.
 */
const ITEMS = [
  {
    Icon: Truck,
    title: 'Livraison par zone',
    description: 'Frais et délais affichés directement sur chaque produit.',
  },
  {
    Icon: Wallet,
    title: 'Paiement à la livraison',
    description: 'Orange Money, Moov Money ou espèces à réception.',
  },
  {
    Icon: ShieldCheck,
    title: 'Commande validée par le vendeur',
    description: 'Chaque commande est confirmée avant préparation.',
  },
  {
    Icon: MessageCircle,
    title: 'Suivi sur WhatsApp',
    description: 'Une question ? Le vendeur vous répond directement.',
  },
] as const

export function Reassurance() {
  return (
    <section aria-label="Réassurance" className="px-4 py-[--spacing-ls-8]">
      <ul className="grid grid-cols-1 gap-[--spacing-ls-6] md:grid-cols-3">
        {ITEMS.map(({ Icon, title, description }) => (
          <li key={title} className="flex items-start gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[--radius-ls-btn] bg-ls-accent-light text-ls-accent">
              <Icon size={20} />
            </span>
            <div>
              <p className="[font:var(--text-ls-h2)] text-[15px]">{title}</p>
              <p className="mt-0.5 [font:var(--text-ls-body)] text-ls-gray-500">
                {description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}