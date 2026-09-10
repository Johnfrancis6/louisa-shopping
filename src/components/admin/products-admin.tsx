'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createProduct, toggleProductActive } from '@/lib/actions/admin/products'
import { createVariant } from '@/lib/actions/admin/variants'
import { fieldInput, btnPrimary, btnGhost } from './ui'

type CategoryOption = { id: string; name: string }

function Label({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-ls-gray-500">
      {label}
      {children}
    </label>
  )
}

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
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <Label label="Nom">
        <input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={fieldInput} />
      </Label>
      <Label label="Slug">
        <input
          required
          value={f.slug}
          onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase() })}
          className={fieldInput}
        />
      </Label>
      <Label label="Catégorie">
        <select
          value={f.categoryId}
          onChange={(e) => setF({ ...f, categoryId: e.target.value })}
          className={fieldInput}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Label>
      <Label label="Prix base (FCFA)">
        <input
          required
          inputMode="numeric"
          value={f.basePrice}
          onChange={(e) => setF({ ...f, basePrice: e.target.value })}
          className={fieldInput}
        />
      </Label>
      <button type="submit" disabled={pending || !f.categoryId} className={btnPrimary + ' sm:col-span-2'}>
        Ajouter le produit
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
      className={
        'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors disabled:opacity-40 ' +
        (isActive
          ? 'bg-ls-success-bg text-ls-success'
          : 'bg-ls-gray-100 text-ls-gray-500')
      }
    >
      <span className={'h-2 w-2 rounded-full ' + (isActive ? 'bg-ls-success' : 'bg-ls-gray-400')} />
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
      <button type="button" onClick={() => setOpen(true)} className={btnGhost + ' -ml-3'}>
        + Ajouter une variante
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
    <form onSubmit={submit} className="grid grid-cols-2 gap-2">
      <input required placeholder="SKU" value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} className={fieldInput + ' col-span-2'} />
      <input placeholder="Taille" value={f.size} onChange={(e) => setF({ ...f, size: e.target.value })} className={fieldInput} />
      <input placeholder="Couleur" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} className={fieldInput} />
      <input placeholder="Prix override" inputMode="numeric" value={f.priceOverride} onChange={(e) => setF({ ...f, priceOverride: e.target.value })} className={fieldInput} />
      <input placeholder="Stock initial" inputMode="numeric" value={f.initialStock} onChange={(e) => setF({ ...f, initialStock: e.target.value })} className={fieldInput} />
      <button type="submit" disabled={pending} className={btnPrimary}>
        Ajouter
      </button>
      <button type="button" onClick={() => setOpen(false)} className={btnGhost}>
        Annuler
      </button>
    </form>
  )
}
