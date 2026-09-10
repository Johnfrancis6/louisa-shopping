/**
 * src/components/admin/ui.tsx
 * Primitives d'affichage partagées du back-office. Mobile-first : les listes
 * sont des cartes empilées ; l'admin garde son encre/violet propre (pas de
 * dépendance à docs/design storefront).
 */
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/* Boutons — classes réutilisables (aucune cible < 40px de haut). */
export const btnPrimary =
  'inline-flex h-10 items-center justify-center gap-1.5 rounded-ls-sm bg-ls-violet px-3.5 text-sm font-medium text-white transition-colors hover:bg-ls-violet-dark disabled:opacity-40'
export const btnOutline =
  'inline-flex h-10 items-center justify-center gap-1.5 rounded-ls-sm border border-ls-gray-300 bg-white px-3 text-sm font-medium text-ls-gray-800 transition-colors hover:bg-ls-gray-50 disabled:opacity-40'
export const btnGhost =
  'inline-flex h-10 items-center justify-center gap-1.5 rounded-ls-sm px-3 text-sm font-medium text-ls-gray-600 transition-colors hover:bg-ls-gray-100 disabled:opacity-40'
export const btnDanger =
  'inline-flex h-10 items-center justify-center gap-1.5 rounded-ls-sm border border-ls-danger/30 bg-white px-3 text-sm font-medium text-ls-danger transition-colors hover:bg-ls-danger-bg disabled:opacity-40'
export const fieldInput =
  'h-10 w-full rounded-ls-sm border border-ls-gray-300 bg-white px-3 text-sm text-ls-gray-900 outline-none transition-colors focus-visible:border-ls-violet focus-visible:ring-2 focus-visible:ring-ls-violet/30'

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold text-ls-gray-900 sm:text-xl">{title}</h1>
        {description && (
          <p className="mt-1 max-w-prose text-sm text-ls-gray-500">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

/** Conteneur d'un formulaire ou d'un bloc encadré. */
export function Panel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-ls-md border border-ls-gray-200 bg-white p-4 shadow-ls-card sm:p-5',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Liste de cartes — 1 colonne mobile, `cols` colonnes ≥ md. */
export function CardList({
  children,
  cols = 1,
  className,
}: {
  children: ReactNode
  cols?: 1 | 2 | 3
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid gap-3',
        cols === 2 && 'md:grid-cols-2',
        cols === 3 && 'md:grid-cols-2 xl:grid-cols-3',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function Card({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-ls-md border border-ls-gray-200 bg-white p-4 shadow-ls-card',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Ligne label / valeur à l'intérieur d'une carte. */
export function Field({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3 text-sm', className)}>
      <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-ls-gray-400">
        {label}
      </span>
      <span className="min-w-0 text-right text-ls-gray-900">{children}</span>
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-ls-md border border-dashed border-ls-gray-300 bg-white px-4 py-12 text-center text-sm text-ls-gray-500">
      {children}
    </div>
  )
}

export function LoadingRows() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-24 rounded-ls-md border border-ls-gray-200 bg-white">
          <div className="ls-skeleton h-full w-full rounded-ls-md" />
        </div>
      ))}
    </div>
  )
}
