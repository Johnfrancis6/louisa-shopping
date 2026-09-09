// src/components/storefront/hero.tsx
import Image from 'next/image'
import Link from 'next/link'

/**
 * Le loader Cloudinary est configuré globalement dans next.config.ts
 * (images.loaderFile) — ne pas passer `loader={...}` par image : une fonction
 * ne peut pas traverser la frontière RSC (Server Component).
 *
 * Statique par contrainte explicite (ui-reference.md §5.2 : "Hero homepage —
 * nuit à la conversion, statique obligatoire"). Ne jamais y ajouter
 * d'entrée animée / autoplay.
 *
 * ÉCART SIGNALÉ : le contrat technique ne définit pas de route /catalogue
 * générique (seulement /[category]) — le CTA y pointe quand même, arbitrage
 * utilisateur de cette session. À créer ou à corriger vers /[category] une
 * fois la structure de routing du catalogue tranchée.
 *
 * Titre / sous-titre / image : contenu placeholder, à remplacer — non
 * fournis par l'utilisateur, choisis pour ne pas bloquer l'avancement
 * (contrairement au CTA et à la donnée catégories, discutés explicitement).
 *
 * Tokens typo appliqués via propriété arbitraire Tailwind ([font:var(...)])
 * plutôt que via une classe text-ls-h1 générée : --text-ls-h1 est un
 * shorthand CSS complet (weight/size/line-height/family), pas juste une
 * taille — plus sûr de l'appliquer explicitement à la propriété `font`.
 */
export function Hero() {
  return (
    <section className="relative flex min-h-[420px] items-end overflow-hidden bg-ls-gray-200 md:min-h-[480px]">
      <Image
        src="https://res.cloudinary.com/demo/image/upload/sample"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

      <div className="relative z-10 w-full px-4 pb-8 text-white md:px-8 md:pb-12">
        <h1 className="[font:var(--text-ls-h1)] md:text-3xl">
          Le quotidien, livré simplement
        </h1>
        <p className="mt-2 max-w-md [font:var(--text-ls-body)] text-white/90">
          Électroménager, mode, maison — commandez et suivez votre livraison
          jusqu&apos;à WhatsApp.
        </p>
        <Link
          href="/catalogue"
          className="mt-4 inline-flex h-11 items-center justify-center rounded-[--radius-ls-btn] bg-ls-accent px-6 text-white shadow-ls-cta [font:var(--text-ls-body)] transition-colors duration-[--duration-ls-fast] hover:bg-ls-accent-dark"
        >
          Découvrir le catalogue
        </Link>
      </div>
    </section>
  )
}