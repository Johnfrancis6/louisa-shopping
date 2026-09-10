'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Dialog } from '@base-ui/react/dialog'
import { Search, ArrowRight, Clock, X } from 'lucide-react'
import { searchStorefront, type SearchResults } from '@/lib/actions/search'
import { formatPrice } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

/* ────────────────────────────────────────────────────────────
 * Contexte — une seule modale, montée dans le layout storefront,
 * ouverte depuis la navbar (desktop + mobile) et la bottom nav.
 * ──────────────────────────────────────────────────────────── */

type SearchContextValue = { open: () => void }
const SearchContext = createContext<SearchContextValue | null>(null)

export function useSearch(): SearchContextValue {
  const ctx = useContext(SearchContext)
  if (!ctx) throw new Error('useSearch must be used within <SearchProvider>')
  return ctx
}

const RECENT_KEY = 'ls-recent-searches'
const RECENT_MAX = 5

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? (JSON.parse(raw) as string[]).slice(0, RECENT_MAX) : []
  } catch {
    return []
  }
}

export function SearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [openCount, setOpenCount] = useState(0)
  const [recent, setRecent] = useState<string[]>([])

  const open = useCallback(() => {
    setRecent(readRecent())
    setOpenCount((n) => n + 1)
    setIsOpen(true)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        open()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const value = useMemo<SearchContextValue>(() => ({ open }), [open])

  return (
    <SearchContext.Provider value={value}>
      {children}
      <SearchModal
        key={openCount}
        open={isOpen}
        onOpenChange={setIsOpen}
        initialRecent={recent}
      />
    </SearchContext.Provider>
  )
}

/* ────────────────────────────────────────────────────────────
 * Déclencheur navbar desktop — un bouton qui ressemble à un input.
 * ──────────────────────────────────────────────────────────── */

export function SearchTrigger() {
  const { open } = useSearch()
  return (
    <button
      type="button"
      onClick={open}
      className="flex w-full items-center gap-2 rounded-ls-sm border border-ls-gray-200 bg-ls-gray-50 py-2 pl-3 pr-2 text-left text-ls-body text-ls-gray-500 transition-colors hover:border-ls-gray-300"
    >
      <Search size={18} className="shrink-0" />
      <span className="flex-1 truncate">Rechercher un produit…</span>
      <kbd className="hidden shrink-0 rounded border border-ls-gray-200 bg-ls-white px-1.5 py-0.5 text-[11px] font-medium text-ls-gray-500 md:inline">
        ⌘K
      </kbd>
    </button>
  )
}

/* ────────────────────────────────────────────────────────────
 * Modale
 * ──────────────────────────────────────────────────────────── */

type FlatItem =
  | { kind: 'product'; id: string; href: string; label: string; sub: string; image: string | null; price: string }
  | { kind: 'category'; id: string; href: string; label: string; image: string | null; count: number }
  | { kind: 'all'; id: 'all'; href: string; label: string }

function SearchModal({
  open,
  onOpenChange,
  initialRecent,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialRecent: string[]
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>({ products: [], categories: [] })
  const [recent, setRecent] = useState<string[]>(initialRecent)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPending, startTransition] = useTransition()
  const reqId = useRef(0)

  // Recherche live (debounce 150 ms, garde le dernier requestId).
  // < 2 caractères : on ne relance pas (les résultats précédents restent
  // masqués par l'état "vide" côté rendu).
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) return
    const id = ++reqId.current
    const t = setTimeout(() => {
      startTransition(async () => {
        const res = await searchStorefront(q)
        if (id === reqId.current) {
          setResults(res)
          setActiveIndex(0)
        }
      })
    }, 150)
    return () => clearTimeout(t)
  }, [query])

  const items = useMemo<FlatItem[]>(() => {
    const q = query.trim()
    const list: FlatItem[] = []
    for (const p of results.products) {
      const min = Math.min(...p.variants.map((v) => v.unitPrice))
      list.push({
        kind: 'product',
        id: p.id,
        href: `/produits/${p.slug}`,
        label: p.name,
        sub: p.variants[0]?.sku ?? '',
        image: p.variants[0]?.imageUrl ?? null,
        price: formatPrice(min),
      })
    }
    for (const c of results.categories) {
      list.push({
        kind: 'category',
        id: c.id,
        href: `/catalogue?categorie=${c.slug}`,
        label: c.name,
        image: c.image_url,
        count: c.count,
      })
    }
    if (q.length >= 2) {
      list.push({
        kind: 'all',
        id: 'all',
        href: `/recherche?q=${encodeURIComponent(q)}`,
        label: `Voir tous les résultats pour « ${q} »`,
      })
    }
    return list
  }, [results, query])

  const commitRecent = useCallback((term: string) => {
    const t = term.trim()
    if (t.length < 2) return
    try {
      const next = [t, ...readRecent().filter((x) => x !== t)].slice(0, RECENT_MAX)
      localStorage.setItem(RECENT_KEY, JSON.stringify(next))
    } catch {
      /* localStorage indisponible — on ignore */
    }
  }, [])

  const go = useCallback(
    (href: string, term?: string) => {
      commitRecent(term ?? query)
      onOpenChange(false)
      router.push(href)
    },
    [commitRecent, onOpenChange, query, router],
  )

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (items.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = items[activeIndex]
      if (item) go(item.href)
    }
  }

  const showEmpty = query.trim().length < 2
  const showNoResults = !showEmpty && !isPending && items.length === 0

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-[var(--duration-ls-fast)] data-starting-style:opacity-0 data-ending-style:opacity-0" />
        <Dialog.Popup className="fixed inset-x-4 top-[8vh] z-50 mx-auto flex max-h-[80vh] max-w-xl flex-col overflow-hidden rounded-ls-lg bg-ls-white shadow-lg ring-1 ring-black/5 outline-none transition duration-[var(--duration-ls-fast)] ease-[var(--ease-ls-out)] data-starting-style:translate-y-2 data-starting-style:opacity-0 data-starting-style:scale-95 data-ending-style:opacity-0 data-ending-style:scale-95">
          <Dialog.Title className="sr-only">Rechercher un produit</Dialog.Title>

          {/* En-tête */}
          <div className="flex items-center gap-3 border-b border-ls-gray-200 px-4 py-3">
            <Search size={18} className="shrink-0 text-ls-gray-500" />
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Rechercher un produit…"
              aria-label="Rechercher un produit"
              className="w-full bg-transparent text-ls-body text-ls-gray-900 outline-none placeholder:text-ls-gray-500"
            />
            <kbd className="hidden shrink-0 rounded border border-ls-gray-200 px-1.5 py-0.5 text-[11px] font-medium text-ls-gray-500 sm:inline">
              esc
            </kbd>
          </div>

          {/* Corps */}
          <div className="min-h-0 flex-1 overflow-y-auto py-2 ">
            {showEmpty && recent.length > 0 && (
              <Group label="Recherches récentes">
                {recent.map((term) => (
                  <div
                    key={term}
                    className="flex items-center gap-3 px-4 py-1 text-ls-body text-ls-gray-900 hover:bg-ls-gray-50"
                  >
                    <Clock size={16} className="shrink-0 text-ls-gray-500" />
                    <button
                      type="button"
                      onClick={() => setQuery(term)}
                      className="flex-1 truncate py-1.5 text-left"
                    >
                      {term}
                    </button>
                    <button
                      type="button"
                      aria-label={`Retirer « ${term} » des recherches récentes`}
                      onClick={() => {
                        try {
                          const next = readRecent().filter((x) => x !== term)
                          localStorage.setItem(RECENT_KEY, JSON.stringify(next))
                          setRecent(next)
                        } catch {
                          /* localStorage indisponible */
                        }
                      }}
                      className="shrink-0 p-1 text-ls-gray-300 hover:text-ls-gray-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </Group>
            )}

            {showEmpty && recent.length === 0 && (
              <p className="px-4 py-8 text-center text-ls-body text-ls-gray-500">
                Tapez pour rechercher dans le catalogue.
              </p>
            )}

            {showNoResults && (
              <div className="px-4 py-8 text-center">
                <p className="text-ls-body text-ls-gray-500">
                  Aucun résultat pour «&nbsp;{query.trim()}&nbsp;».
                </p>
                <button
                  type="button"
                  onClick={() => go('/catalogue')}
                  className="mt-2 text-ls-label font-medium text-ls-violet-dark underline hover:text-ls-violet"
                >
                  Parcourir le catalogue
                </button>
              </div>
            )}

            {!showEmpty && items.length > 0 && (
              <SearchList
                items={items}
                activeIndex={activeIndex}
                onHover={setActiveIndex}
                onSelect={(item) => go(item.href)}
              />
            )}
          </div>

          {/* Pied — rappels clavier (desktop) */}
          <div className="hidden items-center gap-4 border-t border-ls-gray-200 px-4 py-2 text-ls-label text-ls-gray-500 sm:flex">
            <span>↑↓ naviguer</span>
            <span>↵ ouvrir</span>
            <span>esc fermer</span>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="pb-1 ">
      <p className="px-4 pb-1 pt-2 text-ls-label uppercase tracking-wide text-ls-gray-500">
        {label}
      </p>
      {children}
    </div>
  )
}

function SearchList({
  items,
  activeIndex,
  onHover,
  onSelect,
}: {
  items: FlatItem[]
  activeIndex: number
  onHover: (i: number) => void
  onSelect: (item: FlatItem) => void
}) {
  const products = items.filter((i) => i.kind === 'product')
  const categories = items.filter((i) => i.kind === 'category')
  const all = items.find((i) => i.kind === 'all')

  return (
    <>
      {products.length > 0 && (
        <Group label="Produits">
          {products.map((item) => (
            <Row
              key={item.id}
              active={items.indexOf(item) === activeIndex}
              onMouseMove={() => onHover(items.indexOf(item))}
              onClick={() => onSelect(item)}
            >
              <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-ls-sm bg-ls-gray-50">
                {item.kind === 'product' && item.image && (
                  <Image src={item.image} alt="" fill sizes="48px" className="object-cover" />
                )}
              </span>
              <span className="min-w-0 flex-1 truncate text-ls-body">
                <span className="text-ls-gray-900">{item.label}</span>
                {item.kind === 'product' && item.sub && (
                  <span className="text-ls-label text-ls-gray-400"> · {item.sub}</span>
                )}
              </span>
              {item.kind === 'product' && (
                <span className="shrink-0 font-semibold text-ls-gray-900">{item.price}</span>
              )}
            </Row>
          ))}
        </Group>
      )}

      {categories.length > 0 && (
        <Group label="Catégories">
          {categories.map((item) => (
            <Row
              key={item.id}
              active={items.indexOf(item) === activeIndex}
              onMouseMove={() => onHover(items.indexOf(item))}
              onClick={() => onSelect(item)}
            >
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ls-gray-50 text-ls-gray-500">
                {item.kind === 'category' && item.image ? (
                  <Image src={item.image} alt="" fill sizes="44px" className="object-cover" />
                ) : (
                  <Search size={15} />
                )}
              </span>
              <span className="min-w-0 flex-1 truncate text-ls-body">
                <span className="text-ls-gray-900">{item.label}</span>
                {item.kind === 'category' && item.count > 0 && (
                  <span className="text-ls-label text-ls-gray-400">
                    {' '}
                    · {item.count} article{item.count > 1 ? 's' : ''}
                  </span>
                )}
              </span>
            </Row>
          ))}
        </Group>
      )}

      {all && (
        <Row
          active={items.indexOf(all) === activeIndex}
          onMouseMove={() => onHover(items.indexOf(all))}
          onClick={() => onSelect(all)}
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ls-gray-50 text-ls-gray-500">
            <ArrowRight size={15} />
          </span>
          <span className="flex-1 truncate text-ls-body text-ls-gray-900">{all.label}</span>
        </Row>
      )}
    </>
  )
}

function Row({
  active,
  children,
  onClick,
  onMouseMove,
}: {
  active: boolean
  children: ReactNode
  onClick: () => void
  onMouseMove: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseMove={onMouseMove}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
        active
          ? 'bg-ls-violet-bg shadow-[inset_2px_0_0_var(--color-ls-violet)]'
          : 'bg-transparent',
      )}
    >
      {children}
    </button>
  )
}
