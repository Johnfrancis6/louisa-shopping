// src/components/storefront/cart/cart-client.tsx
'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updateCartItem, removeFromCart, type CartItem } from '@/lib/actions/cart'
import { CartItemRow } from './cart-item-row'
import { CartSummary } from './cart-summary'
import { EmptyCart } from './empty-cart'

interface CartClientProps {
  initialItems: CartItem[]
}

export function CartClient({ initialItems }: CartClientProps) {
  const [items, setItems] = useState<CartItem[]>(initialItems)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function run(
    variantId: string,
    action: () => Promise<{ success: boolean; error?: string; cart?: { items: CartItem[] } }>,
  ) {
    setPendingId(variantId)
    startTransition(async () => {
      const res = await action()
      if (res.cart) setItems(res.cart.items)
      if (!res.success && res.error) toast.error(res.error)
      setPendingId(null)
    })
  }

  const changeQty = (variantId: string, qty: number) =>
    run(variantId, () => updateCartItem(variantId, qty))

  const remove = (variantId: string) =>
    run(variantId, () => removeFromCart(variantId))

  if (items.length === 0) return <EmptyCart />

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      <div className="flex-1">
        <ul>
          {items.map((item) => (
            <CartItemRow
              key={item.variantId}
              item={item}
              onQuantityChange={changeQty}
              onRemove={remove}
              isPending={pendingId === item.variantId}
            />
          ))}
        </ul>
      </div>

      <div className="lg:w-80 lg:sticky lg:top-24">
        <CartSummary items={items} />
      </div>
    </div>
  )
}
