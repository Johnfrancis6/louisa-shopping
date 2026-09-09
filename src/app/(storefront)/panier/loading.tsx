// src/app/(storefront)/panier/loading.tsx
export default function PanierLoading() {
  return (
    <div className="px-4 pt-6 pb-24 max-w-2xl mx-auto animate-pulse">
      <div className="h-6 w-32 rounded bg-[var(--color-ls-surface-2)] mb-6" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-3 py-4 border-b border-[var(--color-ls-border)]">
          <div className="w-20 h-20 rounded-xl bg-[var(--color-ls-surface-2)] flex-shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <div className="h-3 w-3/4 rounded bg-[var(--color-ls-surface-2)]" />
            <div className="h-2.5 w-1/3 rounded bg-[var(--color-ls-surface-2)]" />
            <div className="h-3 w-1/4 rounded bg-[var(--color-ls-surface-2)] mt-auto" />
          </div>
        </div>
      ))}
      <div className="mt-6 h-48 rounded-2xl bg-[var(--color-ls-surface-2)]" />
    </div>
  )
}