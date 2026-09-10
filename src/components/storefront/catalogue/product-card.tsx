'use client'

import { useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'
import { addToCart } from '@/lib/actions/cart'
import { formatPrice } from '@/lib/utils/format'
import type { Product } from '@/types/catalog'

/**
 * Comportement du bouton rond :
 * - 1 seule variante ET en stock → ajout direct au panier (addToCart)
 * - plusieurs variantes OU rupture → redirection vers la fiche produit
 */
export function ProductCard({ product }: { product: Product }) {
  const [isPending, startTransition] = useTransition()
  const primaryVariant = product.variants[0]
  const canQuickAdd = product.variants.length === 1 && primaryVariant.stock_qty > 0

  const prices = product.variants.map((v) => v.unitPrice)
  const minPrice = Math.min(...prices)
  const priceLabel = canQuickAdd
    ? formatPrice(primaryVariant.unitPrice)
    : `À partir de ${formatPrice(minPrice)}`

  function handleQuickAdd() {
    startTransition(async () => {
      const res = await addToCart(primaryVariant.id, 1)
      if (res.success) {
        toast.success('Ajouté au panier')
      } else {
        toast.error(res.error ?? "Impossible d'ajouter ce produit au panier")
      }
    })
  }

  return (
    <div className="ls-reveal rounded-ls-md bg-ls-white p-3 shadow-ls-card transition-[transform,box-shadow] duration-[var(--duration-ls-fast)] ease-[var(--ease-ls-out)] md:hover:-translate-y-0.5 md:hover:shadow-ls-card-hover">
      <Link href={`/produits/${product.slug}`} className="block">
        <p className="text-ls-body font-medium text-ls-gray-900">{product.name}</p>
        <p className="text-ls-label text-ls-gray-500">{primaryVariant.sku}</p>

        <div className="relative mt-2 aspect-square rounded-ls-sm bg-ls-gray-50">
          {primaryVariant.imageUrl && (
            <div className="absolute inset-4">
              <Image
                src={primaryVariant.imageUrl}
                alt={product.name}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                className="object-contain"
              />
            </div>
          )}
        </div>
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-[19px] font-semibold text-ls-gray-900">{priceLabel}</span>

        {canQuickAdd ? (
          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={isPending}
            aria-label="Ajouter au panier"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ls-violet text-ls-white transition-[transform,opacity] duration-[var(--duration-ls-fast)] hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            <ShoppingBag className="h-[18px] w-[18px]" />
          </button>
        ) : (
          <Link
            href={`/produits/${product.slug}`}
            aria-label="Voir le produit"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ls-violet text-ls-white transition-transform duration-[var(--duration-ls-fast)] hover:scale-105 active:scale-95"
          >
            <ArrowRight className="h-[18px] w-[18px]" />
          </Link>
        )}
      </div>
    </div>
  )
}