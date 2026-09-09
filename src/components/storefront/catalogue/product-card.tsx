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
    <div className="overflow-hidden rounded-ls-card bg-ls-white shadow-ls-card transition-shadow md:hover:shadow-ls-card-hover">
      <Link href={`/produits/${product.slug}`} className="block">
        <div className="relative aspect-square bg-ls-gray-50">
          {primaryVariant.imageUrl && (
            <Image
              src={primaryVariant.imageUrl}
              alt={product.name}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
              className="object-cover"
            />
          )}
        </div>
      </Link>

      <div className="p-4">
        <Link href={`/produits/${product.slug}`} className="block">
          <p className="text-ls-body font-medium text-ls-gray-900">{product.name}</p>
          <p className="text-ls-label text-ls-gray-500">{primaryVariant.sku}</p>
        </Link>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-ls-price text-ls-gray-900">{priceLabel}</span>

          {canQuickAdd ? (
            <button
              type="button"
              onClick={handleQuickAdd}
              disabled={isPending}
              aria-label="Ajouter au panier"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ls-gray-900 text-ls-white transition-opacity disabled:opacity-50"
            >
              <ShoppingBag className="h-5 w-5" />
            </button>
          ) : (
            <Link
              href={`/produits/${product.slug}`}
              aria-label="Voir le produit"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ls-gray-900 text-ls-white"
            >
              <ArrowRight className="h-5 w-5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}