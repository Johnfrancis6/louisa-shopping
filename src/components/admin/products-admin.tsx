'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createProduct, toggleProductActive } from '@/lib/actions/admin/products'
import { createVariant } from '@/lib/actions/admin/variants'

type CategoryOption = { id: string; name: string }

const input = 'rounded border border-ls-gray-300 px-2 py-1.5 text-sm'

export function ProductCreateForm({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [f, setF] = useState({ name: '', slug: '', categoryId: categories[0]?.id ?? '', basePrice: '' })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const price = Number(f.basePrice)
    start(async () => {
      const res = await createProduct({
        name: f.name,
        slug: f.slug,
        categoryId: f.categoryId,
        basePrice: price,
      })
      if (res.ok) {
        toast.success('Produit créé')
        setF({ ...f, name: '', slug: '', basePrice: '' })
        router.refresh()
      } else {
        toast.error(res.error ?? 'Échec')
      }
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3 rounded border border-ls-gray-200 bg-white p-4">
      <label className="flex flex-col gap-1 text-xs">
        Nom
        <input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        Slug
        <input
          required
          value={f.slug}
          onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase() })}
          className={input}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        Catégorie
        <select
          value={f.categoryId}
          onChange={(e) => setF({ ...f, categoryId: e.target.value })}
          className={input}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs">
        Prix base (FCFA)
        <input
          required
          inputMode="numeric"
          value={f.basePrice}
          onChange={(e) => setF({ ...f, basePrice: e.target.value })}
          className={`${input} w-28`}
        />
      </label>
      <button
        type="submit"
        disabled={pending || !f.categoryId}
        className="rounded bg-ls-gray-900 px-3 py-1.5 text-sm text-white disabled:opacity-40"
      >
        Ajouter
      </button>
    </form>
  )
}

export function ProductActiveToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await toggleProductActive(id, !isActive)
          if (res.ok) router.refresh()
          else toast.error(res.error ?? 'Échec')
        })
      }
      className="rounded border border-ls-gray-300 px-2 py-1 text-xs hover:bg-ls-gray-50 disabled:opacity-40"
    >
      {isActive ? 'Actif' : 'Inactif'}
    </button>
  )
}

export function VariantCreateForm({ productId }: { productId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ sku: '', size: '', color: '', priceOverride: '', initialStock: '0' })

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-ls-gray-500 underline"
      >
        + variante
      </button>
    )
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    start(async () => {
      const res = await createVariant({
        productId,
        sku: f.sku,
        size: f.size || null,
        color: f.color || null,
        priceOverride: f.priceOverride ? Number(f.priceOverride) : null,
        initialStock: Number(f.initialStock) || 0,
      })
      if (res.ok) {
        toast.success('Variante ajoutée')
        setF({ sku: '', size: '', color: '', priceOverride: '', initialStock: '0' })
        setOpen(false)
        router.refresh()
      } else {
        toast.error(res.error ?? 'Échec')
      }
    })
  }

  return (
    <form onSubmit={submit} className="mt-1 flex flex-wrap items-end gap-2">
      <input required placeholder="SKU" value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} className={`${input} w-28`} />
      <input placeholder="Taille" value={f.size} onChange={(e) => setF({ ...f, size: e.target.value })} className={`${input} w-20`} />
      <input placeholder="Couleur" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} className={`${input} w-24`} />
      <input placeholder="Prix override" inputMode="numeric" value={f.priceOverride} onChange={(e) => setF({ ...f, priceOverride: e.target.value })} className={`${input} w-24`} />
      <input placeholder="Stock init." inputMode="numeric" value={f.initialStock} onChange={(e) => setF({ ...f, initialStock: e.target.value })} className={`${input} w-20`} />
      <button type="submit" disabled={pending} className="rounded bg-ls-gray-900 px-2 py-1.5 text-xs text-white disabled:opacity-40">
        OK
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-ls-gray-500">
        annuler
      </button>
    </form>
  )
}
