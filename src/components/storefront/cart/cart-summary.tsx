// src/components/storefront/cart/cart-summary.tsx
'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { formatPrice } from '@/lib/utils/format'
import type { CartItem } from '@/lib/actions/cart'

export function CartSummary({ items }: { items: CartItem[] }) {
  const total = items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0)

  return (
    <div className="rounded-2xl border border-[var(--color-ls-border)] bg-[var(--color-ls-surface)] p-4 flex flex-col gap-4">
      <h2 className="font-semibold text-[var(--color-ls-text)]">Résumé</h2>

      <div className="flex flex-col gap-2 text-sm">
        {items.map((i) => (
          <div key={i.variantId} className="flex justify-between gap-2">
            <span className="text-[var(--color-ls-text-muted)] line-clamp-1 flex-1">
              {i.productName} ×{i.qty}
            </span>
            <span className="text-[var(--color-ls-text)] font-medium flex-shrink-0">
              {formatPrice(i.unitPrice * i.qty)}
            </span>
          </div>
        ))}
      </div>

      <div className="h-px bg-[var(--color-ls-border)]" />

      <div className="flex justify-between items-baseline">
        <span className="font-semibold text-[var(--color-ls-text)]">Total</span>
        <span className="text-xl font-bold text-[var(--color-ls-primary)]">
          {formatPrice(total)}
        </span>
      </div>

      <p className="text-xs text-[var(--color-ls-text-muted)]">
        Les frais de livraison seront confirmés par le vendeur via WhatsApp.
      </p>

      <Link
        href="/commander"
        className="flex items-center justify-center gap-2 w-full py-3.5 rounded-full bg-[var(--color-ls-primary)] text-white font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all"
      >
        Passer la commande
        <ArrowRight size={18} />
      </Link>
    </div>
  )
}
