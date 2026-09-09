'use client'

import { useMemo, useState, useTransition } from 'react'
import Image from 'next/image'
import { Minus, Plus, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'
import { addToCart } from '@/lib/actions/cart'
import { formatPrice } from '@/lib/utils/format'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { ProductDetail } from '@/types/catalog'

/**
 * Sélection couleur + taille en deux ToggleGroup indépendants (décision prise avant
 * conception). Disponibilité recalculée à chaque changement : une combinaison sans
 * variante correspondante est désactivée plutôt que masquée (on garde la taille visible
 * pour que l'utilisateur comprenne qu'elle existe mais pas dans cette couleur).
 *
 * CTA sticky mobile positionné à `bottom-16` (pas `bottom-0`) pour ne pas recouvrir la
 * bottom nav globale du layout storefront (h-16) — assomption à valider visuellement.
 */
export function ProductPurchaseExperience({ product }: { product: ProductDetail }) {
  const colors = useMemo(
    () => [...new Set(product.variants.map((v) => v.color).filter((c): c is string => !!c))],
    [product.variants]
  )
  const sizes = useMemo(
    () => [...new Set(product.variants.map((v) => v.size).filter((s): s is string => !!s))],
    [product.variants]
  )

  const [selectedColor, setSelectedColor] = useState<string | null>(colors[0] ?? null)
  const [selectedSize, setSelectedSize] = useState<string | null>(sizes[0] ?? null)
  const [qty, setQty] = useState(1)
  const [isPending, startTransition] = useTransition()

  const variant = useMemo(() => {
    return (
      product.variants.find(
        (v) =>
          (selectedColor === null || v.color === selectedColor) &&
          (selectedSize === null || v.size === selectedSize)
      ) ?? product.variants[0]
    )
  }, [product.variants, selectedColor, selectedSize])

  const isSizeAvailable = (size: string) =>
    product.variants.some(
      (v) => v.size === size && (selectedColor === null || v.color === selectedColor) && v.stock_qty > 0
    )

  const activeImage = variant?.imageUrl ?? product.images[0] ?? null
  const inStock = (variant?.stock_qty ?? 0) > 0
  const maxQty = variant?.stock_qty ?? 0

  function handleAddToCart() {
    if (!variant) return
    startTransition(async () => {
      const res = await addToCart(variant.id, qty)
      if (res.success) {
        toast.success(`${product.name} ajouté au panier`)
      } else {
        toast.error(res.error ?? "Impossible d'ajouter au panier")
      }
    })
  }

  return (
    <div className="pb-28 md:pb-0">
      {/* Galerie */}
      <div className="relative aspect-square w-full bg-ls-gray-50">
        {activeImage && (
          <Image
            src={activeImage}
            alt={product.name}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        )}
      </div>

      <div className="px-4 py-6 md:px-12">
        <h1 className="text-ls-h1 text-ls-gray-900">{product.name}</h1>
        <p className="mt-1 text-ls-label text-ls-gray-500">{variant?.sku}</p>
        <p className="mt-3 text-ls-price text-ls-gray-900">
          {variant ? formatPrice(variant.unitPrice) : ''}
        </p>

        <p
          className={`mt-2 text-ls-label ${inStock ? 'text-ls-success' : 'text-ls-danger'}`}
        >
          {inStock ? `En stock — ${maxQty} disponible${maxQty > 1 ? 's' : ''}` : 'Rupture de stock'}
        </p>

        {colors.length > 0 && (
          <div className="mt-6">
            <p className="mb-3 text-ls-body font-medium text-ls-gray-900">Couleur</p>
            <ToggleGroup
                value={selectedColor ? [selectedColor] : []}
              onValueChange={(value) => setSelectedColor(value[0] ?? null)}
              className="justify-start gap-2"
            >
              {colors.map((color) => (
                <ToggleGroupItem key={color} value={color} className="h-11 px-4">
                  {color}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        )}

        {sizes.length > 0 && (
          <div className="mt-6">
            <p className="mb-3 text-ls-body font-medium text-ls-gray-900">Taille</p>
            <ToggleGroup
                value={selectedSize ? [selectedSize] : []}
              onValueChange={(value) => setSelectedSize(value[0] ?? null)}
              className="justify-start gap-2"
            >
              {sizes.map((size) => (
                <ToggleGroupItem
                  key={size}
                  value={size}
                  disabled={!isSizeAvailable(size)}
                  className="h-11 w-11"
                >
                  {size}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        )}

        <p className="mt-6 text-ls-body text-ls-gray-500">{product.description}</p>
      </div>

      {/* CTA — sticky mobile au-dessus de la bottom nav (h-16), statique sur desktop */}
      <div className="fixed inset-x-0 bottom-16 z-30 flex items-center gap-3 border-t border-ls-gray-200 bg-ls-white px-4 py-3 md:static md:mt-4 md:border-0 md:bg-transparent md:px-12 md:py-0">
        <div className="flex h-11 items-center rounded-ls-btn border border-ls-gray-200">
          <button
            type="button"
            aria-label="Diminuer la quantité"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="flex h-11 w-11 items-center justify-center text-ls-gray-500"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-6 text-center text-ls-body text-ls-gray-900">{qty}</span>
          <button
            type="button"
            aria-label="Augmenter la quantité"
            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            disabled={qty >= maxQty}
            className="flex h-11 w-11 items-center justify-center text-ls-gray-500 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!inStock || isPending}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-ls-btn bg-ls-accent text-ls-body font-medium text-ls-white shadow-ls-cta disabled:opacity-40"
        >
          <ShoppingBag className="h-5 w-5" />
          {inStock ? 'Ajouter au panier' : 'Indisponible'}
        </button>
      </div>
    </div>
  )
}