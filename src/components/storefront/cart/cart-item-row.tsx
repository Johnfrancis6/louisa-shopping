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
      className={`flex gap-3 py-4 border-b border-ls-gray-200 last:border-0 transition-opacity ${
        isPending ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      <Link
        href={`/produits/${item.slug}`}
        className="flex-shrink-0 w-20 h-20 rounded-ls-sm overflow-hidden bg-ls-gray-50"
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
          className="text-sm font-medium text-ls-gray-900 line-clamp-2 hover:text-ls-violet-dark transition-colors"
        >
          {item.productName}
        </Link>
        {label && (
          <p className="text-xs text-ls-gray-500">{label}</p>
        )}

        <div className="flex items-center justify-between mt-auto pt-1">
          <span className="text-sm font-semibold text-ls-gray-900">
            {formatPrice(item.unitPrice * item.qty)}
          </span>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-full border border-ls-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => onQuantityChange(item.variantId, item.qty - 1)}
                disabled={item.qty <= 1}
                aria-label="Diminuer la quantité"
                className="w-8 h-8 flex items-center justify-center text-ls-gray-900 disabled:opacity-30 hover:bg-ls-gray-50 transition-colors"
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
                className="w-8 h-8 flex items-center justify-center text-ls-gray-900 disabled:opacity-30 hover:bg-ls-gray-50 transition-colors"
              >
                <Plus size={13} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => onRemove(item.variantId)}
              aria-label={`Retirer ${item.productName} du panier`}
              className="w-8 h-8 flex items-center justify-center rounded-full text-ls-gray-500 hover:text-ls-danger hover:bg-ls-danger-bg transition-colors"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
        {atMax && (
          <p className="text-[11px] text-ls-gray-500">
            Quantité maximale en stock atteinte
          </p>
        )}
      </div>
    </li>
  )
}
