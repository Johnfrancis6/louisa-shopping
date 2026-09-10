'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House, Store, Newspaper, Info, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Liens de navigation principaux — partagés entre la navbar desktop
 * (`NavbarLinks`) et le drawer mobile (`nav-drawer.tsx`).
 * « Accueil » / « Nos boutiques » sont des pages ; les trois autres sont des
 * ancres vers des sections de la home.
 */
export const NAV_LINKS = [
  { href: '/', label: 'Accueil', Icon: House },
  { href: '/catalogue', label: 'Nos boutiques', Icon: Store },
  { href: '/#actualites', label: 'Actualités', Icon: Newspaper },
  { href: '/#a-propos', label: 'À propos', Icon: Info },
  { href: '/#contact', label: 'Contact', Icon: Mail },
] as const

/** Sections de la home observées pour l'état actif des liens à ancre. */
const SECTION_IDS = ['actualites', 'a-propos', 'contact'] as const

/**
 * Prédicat d'état actif. Sur la home, suit la section visible au scroll
 * (IntersectionObserver) : les liens à ancre s'allument quand leur section
 * passe le haut du viewport, « Accueil » quand aucune n'est encore atteinte.
 * Hors home, seul « Nos boutiques » peut être actif (sur `/catalogue*`).
 */
export function useActiveNav(): (href: string) => boolean {
  const pathname = usePathname()
  const onHome = pathname === '/'
  const [section, setSection] = useState<string | null>(null)

  useEffect(() => {
    // Hors home : la dernière valeur de `section` reste en place mais n'est
    // jamais lue (le prédicat est gardé par `onHome`).
    if (!onHome) return

    const els = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null,
    )
    if (els.length === 0) return

    const visible = new Set<string>()
    const recompute = () => {
      let current: string | null = null
      for (const id of SECTION_IDS) if (visible.has(id)) current = id
      setSection(current)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id)
          else visible.delete(e.target.id)
        }
        recompute()
      },
      { rootMargin: '-20% 0px -70% 0px' },
    )
    els.forEach((el) => observer.observe(el))

    // Bas de page : la dernière section n'atteint pas toujours la ligne de
    // détection → on la force active quand on touche le pied de page.
    const onScroll = () => {
      const atBottom =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 4
      if (atBottom) setSection(SECTION_IDS[SECTION_IDS.length - 1])
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
    }
  }, [onHome])

  return (href: string): boolean => {
    if (href.includes('#')) return onHome && section === href.split('#')[1]
    if (href === '/') return onHome && section === null
    return pathname === href || pathname.startsWith(`${href}/`)
  }
}

function NavbarLinksInner() {
  const isActive = useActiveNav()
  return (
    <>
      {NAV_LINKS.map(({ href, label }) => {
        const active = isActive(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'rounded-ls-sm px-2.5 py-1.5 text-sm transition-colors duration-[var(--duration-ls-fast)]',
              active
                ? 'font-medium text-ls-violet-dark'
                : 'text-ls-gray-600 hover:text-ls-gray-900',
            )}
          >
            {label}
          </Link>
        )
      })}
    </>
  )
}

function NavbarLinksFallback() {
  return (
    <>
      {NAV_LINKS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className="rounded-ls-sm px-2.5 py-1.5 text-sm text-ls-gray-600 transition-colors hover:text-ls-gray-900"
        >
          {label}
        </Link>
      ))}
    </>
  )
}

/** Liens horizontaux de la navbar (desktop `lg:` — voir `nav-drawer` en deçà). */
export function NavbarLinks({ className }: { className?: string }) {
  return (
    <nav className={className} aria-label="Pages principales">
      <Suspense fallback={<NavbarLinksFallback />}>
        <NavbarLinksInner />
      </Suspense>
    </nav>
  )
}
