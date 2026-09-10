import Link from 'next/link'
import { Truck, ShieldCheck, MessageCircle, ArrowRight } from 'lucide-react'

/*
 * Sections de contenu de la home, après le showcase catégories.
 * Ordre : process → SAV → actualités.
 * Copie = BROUILLON pour visualiser la cohérence — à valider / ajuster.
 * Restent entre crochets : les faits durs (dates exactes, coordonnées).
 *
 * Style de fond : sobre — grain global (globals.css `body::after`), lueur
 * douce sur le process, trame de points discrète sur les actualités, filet
 * d'accent violet récurrent au-dessus de chaque titre.
 */

const EYEBROW = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-ls-violet-dark'
const HEADING = 'mt-2 text-[26px] font-semibold leading-tight text-ls-gray-900 text-balance'
const LEAD = 'mt-3 max-w-prose text-ls-body text-ls-gray-600'

export function SectionHeader({
  eyebrow,
  heading,
  lead,
}: {
  eyebrow: string
  heading: string
  lead?: string
}) {
  return (
    <header>
      <span className="mb-3 block h-[3px] w-8 rounded-full bg-ls-violet" aria-hidden />
      <p className={EYEBROW}>{eyebrow}</p>
      <h2 className={HEADING}>{heading}</h2>
      {lead && <p className={LEAD}>{lead}</p>}
    </header>
  )
}

/** Parcours d'achat en 3 étapes. Fond violet clair + lueur douce en haut ;
 *  les illustrations Figma remplaceront les cadres pointillés. */
export function ProcessSection() {
  const steps = [
    'Choisissez vos articles et ajoutez-les au panier.',
    'Validez la commande — le vendeur la confirme avec vous sur WhatsApp.',
    'On vous livre dans votre zone. Vous payez à la réception.',
  ]
  return (
    <section
      id="process"
      className="relative overflow-hidden bg-ls-violet-bg px-4 py-14 md:px-12 md:py-16"
    >
      <div className="ls-glow pointer-events-none absolute inset-x-0 -top-32 h-72" aria-hidden />
      <div className="relative mx-auto max-w-5xl">
        <SectionHeader
          eyebrow="Comment ça marche"
          heading="Commander, c’est trois étapes."
          lead="Pas de paiement en ligne : tout se règle à la livraison, et le vendeur reste joignable du panier jusqu’à votre porte."
        />

        <ol className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {steps.map((step, i) => (
            <li
              key={step}
              className="flex flex-col gap-3 rounded-ls-md bg-ls-white p-5 ring-1 ring-ls-violet-tint"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ls-violet text-ls-body font-semibold text-ls-white">
                {i + 1}
              </span>
              <div
                className="flex aspect-[4/3] items-center justify-center rounded-ls-sm border border-dashed border-ls-violet-tint text-ls-label text-ls-violet-dark/60"
                aria-hidden
              >
                Illustration
              </div>
              <p className="text-ls-body text-ls-gray-600">{step}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/** Service & accompagnement — 3 cartes façon "Discover other tools" (Amazon),
 *  icônes uniformes (encre). Fond blanc + trame de points discrète. */
const SAV_CARDS = [
  {
    Icon: Truck,
    title: 'Livraison par zone',
    description:
      'Les frais et les délais sont affichés directement sur chaque produit, avant même de commander.',
    extra: 'Paiement à la réception : Orange Money, Moov Money ou espèces.',
  },
  {
    Icon: MessageCircle,
    title: 'Suivi sur WhatsApp',
    description:
      'Une question sur une commande ou un produit ? Le vendeur vous répond directement, en français.',
    extra: null,
  },
  {
    Icon: ShieldCheck,
    title: 'Commande confirmée',
    description:
      'Chaque commande est vérifiée et confirmée par le vendeur avant d’être préparée et expédiée.',
    extra: null,
  },
] as const

export function SavSection() {
  return (
    <section
      id="sav"
      className="ls-dots border-t border-ls-gray-200 bg-ls-white px-4 py-14 md:px-12 md:py-16"
    >
      <div className="mx-auto max-w-5xl">
        <SectionHeader
          eyebrow="Service & accompagnement"
          heading="On reste joignable, avant et après l’achat."
        />

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {SAV_CARDS.map(({ Icon, title, description, extra }) => (
            <article
              key={title}
              className="flex min-h-40 flex-col gap-3 rounded-ls-md border border-ls-gray-200 bg-ls-white p-5"
            >
              <Icon size={28} strokeWidth={2} className="text-ls-gray-900" />
              <h3 className="text-[17px] font-semibold leading-snug text-ls-gray-900">
                {title}
              </h3>
              <p className="text-ls-body text-ls-gray-600">{description}</p>
              {extra && <p className="text-ls-label text-ls-gray-500">{extra}</p>}
              <Link
                href="/#contact"
                className="mt-auto inline-flex items-center gap-1.5 text-ls-label font-semibold text-ls-violet-dark hover:text-ls-violet"
              >
                En savoir plus <ArrowRight size={14} />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

/** Actualités — image arrondie + texte, sans box blanche autour.
 *  Dates = exemples réalistes à confirmer. */
const NEWS = [
  {
    date: '5 septembre 2026',
    title: 'La sélection saison sèche est arrivée',
    excerpt:
      'De nouveaux modèles d’électroménager, de mode et de cuisine viennent d’entrer en boutique.',
  },
  {
    date: '28 août 2026',
    title: 'La livraison couvre deux nouvelles zones',
    excerpt:
      'Nous étendons notre zone de livraison — vérifiez la vôtre au moment de passer commande.',
  },
  {
    date: '20 août 2026',
    title: 'Suivre sa commande sur WhatsApp, mode d’emploi',
    excerpt:
      'Un guide court pour rester informé à chaque étape, de la validation jusqu’à la livraison.',
  },
]

export function NewsSection() {
  return (
    <section
      id="actualites"
      className="border-t border-ls-gray-200 bg-ls-gray-50 px-4 py-14 md:px-12 md:py-16"
    >
      <div className="mx-auto max-w-5xl">
        <SectionHeader eyebrow="Actualités" heading="Ce qui bouge à la boutique." />

        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
          {NEWS.map((item) => (
            <article key={item.title} className="flex flex-col gap-3">
              <div
                className="aspect-[16/10] rounded-ls-lg bg-ls-gray-200"
                aria-hidden
              />
              <p className="text-ls-label text-ls-gray-500">{item.date}</p>
              <h3 className="text-[15px] font-medium leading-snug text-ls-gray-900">
                {item.title}
              </h3>
              <p className="text-ls-body text-ls-gray-600">{item.excerpt}</p>
              <Link
                href="/#actualites"
                className="inline-flex items-center gap-1.5 text-ls-label font-semibold text-ls-violet-dark hover:text-ls-violet"
              >
                Lire <ArrowRight size={14} />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
