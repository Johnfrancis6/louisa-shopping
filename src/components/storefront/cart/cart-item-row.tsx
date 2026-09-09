// src/components/storefront/cart/cart-item-row.tsx
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { formatPrice } from '@/lib/utils/format'
import type { CartItem } from '@/lib/actions/cart'

interface CartItemRowProps {
  item: CartItem
  onQuantityChange: (variantId: string, qty: number) => void
  onRemove: (variantId: string) => void
  isPending: boolean
}

function variantLabel(item: CartItem): string {
  return [item.size, item.color].filter(Boolean).join(' / ')
}

export function CartItemRow({
  item,
  onQuantityChange,
  onRemove,
  isPending,
}: CartItemRowProps) {
  const label = variantLabel(item)
  const atMax = item.qty >= item.stockQty

  return (
    <li
      className={`flex gap-3 py-4 border-b border-[var(--color-ls-border)] last:border-0 transition-opacity ${
        isPending ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      <Link
        href={`/produits/${item.slug}`}
        className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-[var(--color-ls-surface-2)]"
      >
        {item.imageUrl && (
          <Image
            src={item.imageUrl}
            alt={item.productName}
            width={80}
            height={80}
            className="object-cover w-full h-full"
          />
        )}
      </Link>

      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <Link
          href={`/produits/${item.slug}`}
          className="text-sm font-medium text-[var(--color-ls-text)] line-clamp-2 hover:text-[var(--color-ls-primary)] transition-colors"
        >
          {item.productName}
        </Link>
        {label && (
          <p className="text-xs text-[var(--color-ls-text-muted)]">{label}</p>
        )}

        <div className="flex items-center justify-between mt-auto pt-1">
          <span className="text-sm font-semibold text-[var(--color-ls-primary)]">
            {formatPrice(item.unitPrice * item.qty)}
          </span>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-full border border-[var(--color-ls-border)] overflow-hidden">
              <button
                type="button"
                onClick={() => onQuantityChange(item.variantId, item.qty - 1)}
                disabled={item.qty <= 1}
                aria-label="Diminuer la quantité"
                className="w-8 h-8 flex items-center justify-center text-[var(--color-ls-text)] disabled:opacity-30 hover:bg-[var(--color-ls-surface-2)] transition-colors"
              >
                <Minus size={13} />
              </button>
              <span className="w-7 text-center text-sm font-semibold tabular-nums">
                {item.qty}
              </span>
              <button
                type="button"
                onClick={() => onQuantityChange(item.variantId, item.qty + 1)}
                disabled={atMax}
                aria-label="Augmenter la quantité"
                className="w-8 h-8 flex items-center justify-center text-[var(--color-ls-text)] disabled:opacity-30 hover:bg-[var(--color-ls-surface-2)] transition-colors"
              >
                <Plus size={13} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => onRemove(item.variantId)}
              aria-label={`Retirer ${item.productName} du panier`}
              className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--color-ls-text-muted)] hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
        {atMax && (
          <p className="text-[11px] text-[var(--color-ls-text-muted)]">
            Quantité maximale en stock atteinte
          </p>
        )}
      </div>
    </li>
  )
}
