// src/components/storefront/home/hero.tsx
import Image from 'next/image'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'

/**
 * Hero home. Avec la top bar (h-14), remplit exactement un écran sur mobile
 * (min-h = 100svh − 3.5rem). Statique par contrainte (pas d'entrée animée).
 *
 * PLACEHOLDER : image (Cloudinary demo) à remplacer. La copie ci-dessous est
 * un brouillon pour visualiser la cohérence — à valider / ajuster.
 * Grand titre = violet dédié (#D96AE6) + ombre ; sous-titre blanc.
 */
export function Hero() {
  return (
    <section className="relative flex min-h-[calc(100svh-3.5rem)] flex-col justify-end overflow-hidden bg-ls-gray-200 md:min-h-[560px]">
      <Image
        src="https://res.cloudinary.com/demo/image/upload/sample"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/5" />

      <div className="relative z-10 flex flex-col items-center gap-4 px-6 pb-12 text-center md:items-start md:px-12 md:pb-16 md:text-left">
        <span
          className="h-[3px] w-10 rounded-full bg-ls-violet-hero [box-shadow:0_0_16px_rgba(217,106,230,0.6)]"
          aria-hidden
        />
        <h1 className="max-w-xl text-balance text-3xl font-semibold leading-tight text-ls-violet-hero [text-shadow:0_2px_16px_rgba(0,0,0,0.6)] md:text-5xl">
          La maison, la mode et le quotidien, livrés chez vous.
        </h1>
        <p className="max-w-md [font:var(--text-ls-body)] text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.5)]">
          Électroménager, vêtements, cuisine et plus encore. Vous commandez, on
          vous livre dans votre zone, et tout se confirme sur WhatsApp.
        </p>
        <Link
          href="/catalogue"
          className="mt-2 inline-flex h-12 items-center justify-center rounded-full bg-ls-violet px-8 text-ls-body font-medium text-ls-white shadow-ls-cta transition-colors duration-[var(--duration-ls-fast)] hover:bg-ls-violet-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ls-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/40"
        >
          Découvrir la boutique
        </Link>
      </div>

      {/* Indice de défilement — mobile seulement (le hero desktop n'est pas plein écran) */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center md:hidden"
        aria-hidden
      >
        <ChevronDown className="h-5 w-5 text-white/60 motion-safe:animate-bounce" />
      </div>
    </section>
  )
}
