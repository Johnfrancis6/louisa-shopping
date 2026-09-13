import Link from 'next/link'
import Image from 'next/image'
import { Truck, ShieldCheck, MessageCircle, ArrowRight } from 'lucide-react'
import { getHomeBlocks } from '@/lib/data/home'
import { CatalogRail, type CatalogRailItem } from './catalog-rail'

/*
 * Sections de contenu de la home, après le showcase catégories.
 * Ordre : sélections (carrousel) → process → SAV → actualités.
 *
 * Images, textes et liens viennent de la table `home_block` (/admin/home).
 * Chaque section garde un REPLI en dur : tant que la table est vide, la home
 * rend le brouillon et reste publiable. Dès qu'une ligne existe pour le slot,
 * c'est la base qui gagne — entièrement, jamais un mélange des deux.
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

// ───────────────────────────────────────────────────────────────────────────
// Sélections — carrousel horizontal de blocs catalogue
// ───────────────────────────────────────────────────────────────────────────

/**
 * Repli du carrousel. Sert de gabarit : ce sont exactement les champs à saisir
 * dans /admin/home (slot « rail ») — titre + accroche par-dessus l'image, et
 * un lien vers la catégorie.
 */
const CATALOG_RAIL_FALLBACK: CatalogRailItem[] = [
  {
    id: 'electromenager',
    title: 'Équiper la maison',
    text: 'Le gros et le petit électroménager du quotidien.',
    href: '/catalogue?categorie=electromenager',
    image: null,
  },
  {
    id: 'vetements-femme',
    title: 'La garde-robe femme',
    text: 'Des pièces simples, faciles à assortir.',
    href: '/catalogue?categorie=vetements-femme',
    image: null,
  },
  {
    id: 'sacs-a-main',
    title: 'Sacs à main',
    text: "L'accessoire qui change toute une tenue.",
    href: '/catalogue?categorie=sacs-a-main',
    image: null,
  },
  {
    id: 'cuisine',
    title: 'La table et la cuisine',
    text: 'De la belle vaisselle pour recevoir.',
    href: '/catalogue?categorie=plats',
    image: null,
  },
  {
    id: 'fitness',
    title: 'Bouger à la maison',
    text: 'Vélos et matériel de sport, à votre rythme.',
    href: '/catalogue?categorie=fitness-velos-de-sport',
    image: null,
  },
  {
    id: 'climatiseurs',
    title: 'Garder la fraîcheur',
    text: 'Climatiseurs et ventilation, saison après saison.',
    href: '/catalogue?categorie=climatiseurs',
    image: null,
  },
]

/** Carrousel de sélections. Le header reste serveur ; seule la piste est cliente. */
export async function CatalogRailSection() {
  const blocks = await getHomeBlocks('rail')

  const items: CatalogRailItem[] = blocks.length
    ? blocks.map((block) => ({
        id: block.id,
        title: block.title,
        text: block.body ?? undefined,
        href: block.href ?? '/catalogue',
        image: block.imageUrl,
      }))
    : CATALOG_RAIL_FALLBACK

  return (
    <section
      id="selections"
      className="border-t border-ls-gray-200 bg-ls-gray-50 py-14 md:py-16"
    >
      <div className="mx-auto max-w-5xl px-4 md:px-12">
        <SectionHeader
          eyebrow="Sélections"
          heading="Parcourez le catalogue par envie."
          lead="Faites glisser pour explorer — chaque bloc ouvre la sélection correspondante dans le catalogue."
        />
      </div>

      <CatalogRail items={items} />
    </section>
  )
}

// ───────────────────────────────────────────────────────────────────────────
// Process — parcours d'achat en 3 étapes
// ───────────────────────────────────────────────────────────────────────────

const PROCESS_FALLBACK = [
  'Choisissez vos articles et ajoutez-les au panier.',
  'Validez la commande — le vendeur la confirme avec vous sur WhatsApp.',
  'On vous livre dans votre zone. Vous payez à la réception.',
]

/** Parcours d'achat en 3 étapes. Fond violet clair + lueur douce en haut ;
 *  les illustrations remplacent les cadres pointillés dès qu'elles existent. */
export async function ProcessSection() {
  const blocks = await getHomeBlocks('process')

  const steps = blocks.length
    ? blocks.map((block) => ({
        id: block.id,
        text: block.body ?? block.title,
        imageUrl: block.imageUrl,
      }))
    : PROCESS_FALLBACK.map((text, i) => ({
        id: `process-fallback-${i}`,
        text,
        imageUrl: null,
      }))

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
              key={step.id}
              className="flex flex-col gap-3 rounded-ls-md bg-ls-white p-5 ring-1 ring-ls-violet-tint"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ls-violet text-ls-body font-semibold text-ls-white">
                {i + 1}
              </span>
              {step.imageUrl ? (
                <div className="relative aspect-[4/3] overflow-hidden rounded-ls-sm bg-ls-violet-bg">
                  <Image
                    src={step.imageUrl}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 30vw, 90vw"
                    className="object-cover"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div
                  className="flex aspect-[4/3] items-center justify-center rounded-ls-sm border border-dashed border-ls-violet-tint text-ls-label text-ls-violet-dark/60"
                  aria-hidden
                >
                  Illustration
                </div>
              )}
              <p className="text-ls-body text-ls-gray-600">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

// ───────────────────────────────────────────────────────────────────────────
// SAV — statique (icônes, pas d'images à gérer)
// ───────────────────────────────────────────────────────────────────────────

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

// ───────────────────────────────────────────────────────────────────────────
// Actualités
// ───────────────────────────────────────────────────────────────────────────

/** Repli. Dates = exemples réalistes à confirmer. */
const NEWS_FALLBACK = [
  {
    id: 'news-fallback-0',
    eyebrow: '5 septembre 2026',
    title: 'La sélection saison sèche est arrivée',
    body:
      'De nouveaux modèles d’électroménager, de mode et de cuisine viennent d’entrer en boutique.',
    href: '/#actualites',
    imageUrl: null as string | null,
  },
  {
    id: 'news-fallback-1',
    eyebrow: '28 août 2026',
    title: 'La livraison couvre deux nouvelles zones',
    body:
      'Nous étendons notre zone de livraison — vérifiez la vôtre au moment de passer commande.',
    href: '/#actualites',
    imageUrl: null as string | null,
  },
  {
    id: 'news-fallback-2',
    eyebrow: '20 août 2026',
    title: 'Suivre sa commande sur WhatsApp, mode d’emploi',
    body:
      'Un guide court pour rester informé à chaque étape, de la validation jusqu’à la livraison.',
    href: '/#actualites',
    imageUrl: null as string | null,
  },
]

/** Actualités — image arrondie + texte, sans box blanche autour. */
export async function NewsSection() {
  const blocks = await getHomeBlocks('news')

  const items = blocks.length
    ? blocks.map((block) => ({
        id: block.id,
        eyebrow: block.eyebrow ?? '',
        title: block.title,
        body: block.body ?? '',
        href: block.href ?? '/#actualites',
        imageUrl: block.imageUrl,
      }))
    : NEWS_FALLBACK

  return (
    <section
      id="actualites"
      className="border-t border-ls-gray-200 bg-ls-gray-50 px-4 py-14 md:px-12 md:py-16"
    >
      <div className="mx-auto max-w-5xl">
        <SectionHeader eyebrow="Actualités" heading="Ce qui bouge à la boutique." />

        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="flex flex-col gap-3">
              {item.imageUrl ? (
                <div className="relative aspect-[16/10] overflow-hidden rounded-ls-lg bg-ls-gray-200">
                  <Image
                    src={item.imageUrl}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 30vw, 90vw"
                    className="object-cover"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="aspect-[16/10] rounded-ls-lg bg-ls-gray-200" aria-hidden />
              )}
              {item.eyebrow && (
                <p className="text-ls-label text-ls-gray-500">{item.eyebrow}</p>
              )}
              <h3 className="text-[15px] font-medium leading-snug text-ls-gray-900">
                {item.title}
              </h3>
              {item.body && <p className="text-ls-body text-ls-gray-600">{item.body}</p>}
              <Link
                href={item.href}
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
