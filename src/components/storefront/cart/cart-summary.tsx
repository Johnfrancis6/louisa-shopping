// src/components/storefront/cart/cart-summary.tsx
'use client'

import { WhatsappLogo } from '@phosphor-icons/react'
import { formatPrice } from '@/lib/utils/format'
import type { CartItem } from '@/lib/actions/cart'

interface CartSummaryProps {
  items: CartItem[]
  /** Numéro E.164 issu de WhatsappConfig (DB). null = non configuré. */
  whatsappNumber: string | null
}

function buildWaUrl(items: CartItem[], total: number, number: string): string {
  const lines = items.map((i) => {
    const label = [i.size, i.color].filter(Boolean).join(' / ')
    return `• ${i.productName}${label ? ` (${label})` : ''} ×${i.qty} — ${formatPrice(i.unitPrice * i.qty)}`
  })
  const message = [
    '🛍️ Bonjour, je souhaite passer commande :',
    '',
    ...lines,
    '',
    `Total : ${formatPrice(total)}`,
    '',
    'Merci de confirmer la disponibilité et les frais de livraison.',
  ].join('\n')
  return `https://wa.me/${number.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`
}

export function CartSummary({ items, whatsappNumber }: CartSummaryProps) {
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

      {whatsappNumber ? (
        <a
          href={buildWaUrl(items, total, whatsappNumber)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-full bg-[#25D366] text-white font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all"
        >
          <WhatsappLogo size={20} weight="fill" />
          Commander via WhatsApp
        </a>
      ) : (
        <p className="text-xs text-[var(--color-ls-danger,#DC2626)] text-center">
          Commande WhatsApp indisponible — numéro non configuré.
        </p>
      )}
    </div>
  )
}
