'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import Image from 'next/image'
import { Dialog } from '@base-ui/react/dialog'
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minus,
  Plus,
  ShoppingBag,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { addToCart } from '@/lib/actions/cart'
import { formatPrice } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

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

  const galleryImages = useMemo(() => {
    const all = [
      activeImage,
      ...product.images,
      ...product.variants.map((v) => v.imageUrl),
    ].filter((s): s is string => !!s)
    return [...new Set(all)]
  }, [activeImage, product.images, product.variants])

  function openLightbox() {
    const start = activeImage ? galleryImages.indexOf(activeImage) : 0
    setLightboxIndex(start < 0 ? 0 : start)
  }

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
    <div className="pb-40 md:pb-0">
      {/* Galerie — visuel plein cadre dans un cadre arrondi */}
      <div className="px-4 pt-4 md:px-12 md:pt-8">
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-ls-lg bg-ls-gray-50 md:aspect-square">
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
          {galleryImages.length > 0 && (
            <button
              type="button"
              onClick={openLightbox}
              aria-label="Agrandir l'image"
              className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-ls-white text-ls-gray-900 shadow-ls-card transition-transform duration-[var(--duration-ls-fast)] hover:scale-105 active:scale-95"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <Lightbox
        images={galleryImages}
        index={lightboxIndex}
        alt={product.name}
        onIndexChange={setLightboxIndex}
        onClose={() => setLightboxIndex(null)}
      />

      <div className="px-4 py-6 md:px-12">
        {/* Titre à gauche, prix à droite — même ligne de base */}
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-ls-h1 text-ls-gray-900">{product.name}</h1>
          <span className="shrink-0 text-ls-price text-ls-gray-900">
            {variant ? formatPrice(variant.unitPrice) : ''}
          </span>
        </div>
        <p className="mt-1 text-ls-label text-ls-gray-500">{variant?.sku}</p>

        {colors.length > 0 && (
          <div className="mt-4 border-t border-ls-gray-200 pt-4">
            <p className="text-ls-body text-ls-gray-500">
              <span className="font-medium text-ls-gray-900">Couleur : </span>
              {selectedColor}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {colors.map((color) => {
                const colorVariant = product.variants.find((v) => v.color === color)
                return (
                  <button
                    key={color}
                    type="button"
                    aria-label={color}
                    aria-pressed={selectedColor === color}
                    onClick={() => setSelectedColor(color)}
                    className={cn(
                      'relative h-14 w-14 overflow-hidden rounded-ls-sm border bg-ls-gray-50',
                      selectedColor === color
                        ? 'border-2 border-ls-gray-900'
                        : 'border-ls-gray-200',
                    )}
                  >
                    {colorVariant?.imageUrl && (
                      <Image
                        src={colorVariant.imageUrl}
                        alt={color}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {sizes.length > 0 && (
          <div className="mt-4 border-t border-ls-gray-200 pt-4">
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

        {/* Disponibilité — pastille verte distincte du vert WhatsApp */}
        <div className="mt-4 flex items-center gap-2 border-t border-ls-gray-200 pt-4">
          <span
            className={cn(
              'h-2 w-2 shrink-0 rounded-full',
              inStock ? 'bg-ls-success' : 'bg-ls-danger',
            )}
          />
          <p className={cn('text-ls-label', inStock ? 'text-ls-gray-900' : 'text-ls-danger')}>
            {inStock
              ? `En stock — ${maxQty} disponible${maxQty > 1 ? 's' : ''}`
              : 'Rupture de stock'}
          </p>
        </div>

        <p className="mt-4 border-t border-ls-gray-200 pt-4 text-ls-body text-ls-gray-500">
          {product.description}
        </p>
      </div>

      {/* CTA — sticky mobile calé au-dessus de la bottom nav, statique sur desktop */}
      <div className="fixed inset-x-0 bottom-[var(--ls-bottom-nav-h)] z-30 flex items-center gap-3 border-t border-ls-gray-200 bg-ls-white px-4 py-3 md:static md:bottom-auto md:mt-4 md:border-0 md:bg-transparent md:px-12 md:py-0">
        <div className="flex h-11 items-center rounded-full border border-ls-gray-200">
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
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-ls-violet text-ls-body font-medium text-ls-white shadow-ls-cta transition-[transform,background-color] duration-[var(--duration-ls-fast)] hover:bg-ls-violet-dark active:scale-[0.98] disabled:opacity-40"
        >
          <ShoppingBag className="h-5 w-5" />
          {inStock ? 'Ajouter au panier' : 'Indisponible'}
        </button>
      </div>
    </div>
  )
}

/**
 * Visionneuse plein écran des images produit. Ouverte depuis le bouton
 * « agrandir » de la galerie. Flèches ← → + miniatures si plusieurs images.
 */
function Lightbox({
  images,
  index,
  alt,
  onIndexChange,
  onClose,
}: {
  images: string[]
  index: number | null
  alt: string
  onIndexChange: (i: number) => void
  onClose: () => void
}) {
  const isOpen = index !== null
  const current = index ?? 0

  const prev = useCallback(
    () => onIndexChange((current - 1 + images.length) % images.length),
    [current, images.length, onIndexChange],
  )
  const next = useCallback(
    () => onIndexChange((current + 1) % images.length),
    [current, images.length, onIndexChange],
  )

  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, prev, next])

  return (
    <Dialog.Root open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/90 transition-opacity duration-[var(--duration-ls-fast)] data-starting-style:opacity-0 data-ending-style:opacity-0" />
        <Dialog.Popup className="fixed inset-0 z-50 flex flex-col outline-none transition-opacity duration-[var(--duration-ls-fast)] data-starting-style:opacity-0 data-ending-style:opacity-0">
          <Dialog.Title className="sr-only">{alt}</Dialog.Title>

          <div className="flex justify-end p-4">
            <Dialog.Close
              aria-label="Fermer"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <div className="relative min-h-0 flex-1">
            {images[current] && (
              <Image
                src={images[current]}
                alt={alt}
                fill
                sizes="100vw"
                className="object-contain"
              />
            )}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Image précédente"
                  className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Image suivante"
                  className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex justify-center gap-2 overflow-x-auto p-4">
              {images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => onIndexChange(i)}
                  aria-label={`Image ${i + 1}`}
                  className={cn(
                    'relative h-14 w-14 shrink-0 overflow-hidden rounded-ls-sm transition-opacity',
                    i === current ? 'ring-2 ring-white' : 'opacity-50 hover:opacity-100',
                  )}
                >
                  <Image src={src} alt="" fill sizes="56px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}