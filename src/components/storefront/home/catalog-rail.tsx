'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react'

/**
 * Carrousel horizontal de blocs catalogue (home, après « Nos boutiques »).
 *
 * Pas de librairie : `scroll-snap` CSS + `scrollTo({behavior:'smooth'})`.
 * Embla n'est PAS installé (malgré ce que disait CLAUDE.md) et Framer Motion
 * est interdit — cf. docs/design/motion.md.
 *
 * Trois façons de naviguer, toutes équivalentes :
 *  - tactile : défilement natif (rien à intercepter, on ne casse pas le geste) ;
 *  - souris  : drag sur la piste (pointer events, `pointerType === 'mouse'`) ;
 *  - clavier : Tab entre les blocs, le navigateur les amène dans la vue.
 *
 * Le défilement auto s'arrête dès que l'utilisateur touche le composant
 * (survol, focus, drag) et ne démarre pas du tout sous `prefers-reduced-motion`.
 */

export type CatalogRailItem = {
  /** Identifiant stable — clé React + ancrage des puces. */
  id: string
  /** Titre posé PAR-DESSUS l'image, ancré en haut. */
  title: string
  /** Accroche sous le titre — optionnelle. */
  text?: string
  href: string
  /** URL Cloudinary. `null` → tuile grise, comme le showcase catégories. */
  image?: string | null
}

/** Cadence du défilement auto. Assez lent pour qu'on puisse lire un bloc. */
const AUTOPLAY_MS = 4200
/** Déplacement (px) au-delà duquel un drag ne doit plus déclencher le lien. */
const DRAG_THRESHOLD = 6

export function CatalogRail({
  items,
  label = 'Sélections du catalogue',
}: {
  items: CatalogRailItem[]
  label?: string
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  // `index` est aussi lu dans l'intervalle d'autoplay : un ref évite de
  // recréer l'intervalle à chaque bloc franchi. Tenu à jour dans `syncIndex`
  // (gestionnaire de scroll) — jamais pendant le rendu.
  const indexRef = useRef(0)

  const drag = useRef<{ x: number; left: number } | null>(null)
  const moved = useRef(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedMotion(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  /**
   * Amène le bloc `i` au bord gauche de la piste. On mesure en coordonnées
   * écran (`getBoundingClientRect`) plutôt qu'en `offsetLeft` : insensible au
   * padding de la piste et à l'`offsetParent` réel.
   */
  const scrollToIndex = useCallback(
    (i: number) => {
      const track = trackRef.current
      if (!track) return
      const child = track.children[i] as HTMLElement | undefined
      if (!child) return
      const delta =
        child.getBoundingClientRect().left - track.getBoundingClientRect().left
      track.scrollBy({ left: delta, behavior: reducedMotion ? 'auto' : 'smooth' })
    },
    [reducedMotion],
  )

  /** Bloc le plus proche du bord gauche = bloc « courant ». */
  const syncIndex = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const base = track.getBoundingClientRect().left
    let best = 0
    let bestDistance = Infinity
    for (let i = 0; i < track.children.length; i++) {
      const distance = Math.abs(
        (track.children[i] as HTMLElement).getBoundingClientRect().left - base,
      )
      if (distance < bestDistance) {
        bestDistance = distance
        best = i
      }
    }
    indexRef.current = best
    setIndex(best)
  }, [])

  // Défilement auto — arrêté si figé, si un seul bloc, ou en reduced-motion.
  useEffect(() => {
    if (paused || reducedMotion || items.length < 2) return
    const id = window.setInterval(() => {
      const track = trackRef.current
      if (!track) return
      // Bout de piste atteint : on repart au début plutôt que de forcer un
      // index qui ne bougerait plus (le dernier bloc est déjà collé à droite).
      const atEnd =
        track.scrollLeft + track.clientWidth >= track.scrollWidth - 2
      scrollToIndex(atEnd ? 0 : indexRef.current + 1)
    }, AUTOPLAY_MS)
    return () => window.clearInterval(id)
  }, [paused, reducedMotion, items.length, scrollToIndex])

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Le tactile a déjà un défilement natif parfait : ne pas s'en mêler.
    if (e.pointerType !== 'mouse') return
    const track = trackRef.current
    if (!track) return
    drag.current = { x: e.clientX, left: track.scrollLeft }
    moved.current = false
    setPaused(true)
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const track = trackRef.current
    if (!drag.current || !track) return
    const dx = e.clientX - drag.current.x
    if (Math.abs(dx) > DRAG_THRESHOLD) {
      moved.current = true
      // Capture tardive : on ne vole le pointeur qu'une fois le geste reconnu,
      // sinon un simple clic sur un bloc serait avalé.
      if (!track.hasPointerCapture(e.pointerId)) track.setPointerCapture(e.pointerId)
    }
    track.scrollLeft = drag.current.left - dx
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const track = trackRef.current
    if (!drag.current || !track) return
    drag.current = null
    if (track.hasPointerCapture(e.pointerId)) track.releasePointerCapture(e.pointerId)
    setPaused(false)
  }

  /** Un drag ne doit pas se terminer en navigation. */
  function onClickCapture(e: React.MouseEvent<HTMLDivElement>) {
    if (!moved.current) return
    e.preventDefault()
    e.stopPropagation()
    moved.current = false
  }

  const atStart = index === 0
  const atEnd = index >= items.length - 1

  if (items.length === 0) return null

  return (
    <div
      className="mx-auto mt-8 max-w-5xl"
      role="region"
      aria-roledescription="carrousel"
      aria-label={label}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        ref={trackRef}
        onScroll={syncIndex}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-4 pb-3 scroll-pl-4 md:px-12 md:scroll-pl-12 md:cursor-grab md:active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            draggable={false}
            aria-label={item.text ? `${item.title} — ${item.text}` : item.title}
            className="group relative aspect-[4/5] w-[78%] shrink-0 snap-start overflow-hidden rounded-ls-lg bg-ls-gray-100 shadow-ls-showcase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ls-violet focus-visible:ring-offset-2 sm:w-[52%] lg:w-[32%]"
          >
            {item.image ? (
              <Image
                src={item.image}
                alt=""
                fill
                draggable={false}
                sizes="(min-width: 1024px) 32vw, (min-width: 640px) 52vw, 78vw"
                className="object-cover transition-transform duration-[var(--duration-ls-base)] ease-[var(--ease-ls-out)] md:group-hover:scale-[1.03]"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-ls-gray-300">
                <ShoppingBag className="h-12 w-12" strokeWidth={1.4} aria-hidden />
              </div>
            )}

            {/* Dégradé depuis le HAUT — le texte est posé en haut, pas en bas. */}
            <div
              className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-black/60 via-black/25 to-transparent"
              aria-hidden
            />

            {/* Écriture par-dessus l'image, avec une marge par rapport au top. */}
            <div className="absolute inset-x-0 top-0 flex flex-col gap-1.5 p-5 pt-6">
              <h3 className="text-balance text-[19px] font-semibold leading-tight text-white [text-shadow:0_1px_10px_rgba(0,0,0,0.45)]">
                {item.title}
              </h3>
              {item.text && (
                <p className="max-w-[26ch] text-ls-body text-white/85 [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
                  {item.text}
                </p>
              )}
            </div>

            <span className="absolute bottom-4 right-4 inline-flex h-9 items-center gap-1.5 rounded-full bg-ls-white/95 px-4 text-ls-label font-semibold text-ls-violet-dark shadow-ls-card">
              Voir <ArrowRight size={14} aria-hidden />
            </span>
          </Link>
        ))}
      </div>

      {/* Contrôles : puces partout, flèches à partir de md (pas de survol tactile). */}
      <div className="mt-4 flex items-center justify-between gap-4 px-4 md:px-12">
        <div className="flex items-center gap-2">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToIndex(i)}
              aria-label={`Aller au bloc ${i + 1} : ${item.title}`}
              aria-current={i === index}
              className={`h-1.5 rounded-full transition-[width,background-color] duration-[var(--duration-ls-fast)] ease-[var(--ease-ls-out)] ${
                i === index ? 'w-6 bg-ls-violet' : 'w-1.5 bg-ls-gray-300 hover:bg-ls-gray-400'
              }`}
            />
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <button
            type="button"
            onClick={() => scrollToIndex(Math.max(0, index - 1))}
            disabled={atStart}
            aria-label="Bloc précédent"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-ls-gray-200 bg-ls-white text-ls-gray-900 transition-colors duration-[var(--duration-ls-fast)] hover:bg-ls-gray-100 disabled:opacity-40 disabled:hover:bg-ls-white"
          >
            <ChevronLeft size={18} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => scrollToIndex(Math.min(items.length - 1, index + 1))}
            disabled={atEnd}
            aria-label="Bloc suivant"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-ls-gray-200 bg-ls-white text-ls-gray-900 transition-colors duration-[var(--duration-ls-fast)] hover:bg-ls-gray-100 disabled:opacity-40 disabled:hover:bg-ls-white"
          >
            <ChevronRight size={18} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}
