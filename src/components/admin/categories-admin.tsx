'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ImageUp, Trash2, X } from 'lucide-react'
import {
  createCategory,
  toggleCategoryVisibility,
  deleteCategory,
  updateCategory,
  uploadCategoryImage,
} from '@/lib/actions/admin/categories'
import { Card, fieldInput, btnPrimary, btnDanger, btnOutline } from './ui'

type Row = {
  id: string
  slug: string
  name: string
  bgColor: string
  imageUrl: string | null
  position: number
  visible: boolean
}

export function CategoryCreateForm() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [f, setF] = useState({ name: '', slug: '', bgColor: '#B818C9' })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    start(async () => {
      const res = await createCategory({ name: f.name, slug: f.slug, bgColor: f.bgColor })
      if (res.ok) {
        toast.success('Catégorie créée')
        setF({ name: '', slug: '', bgColor: '#B818C9' })
        router.refresh()
      } else {
        toast.error(res.error ?? 'Échec')
      }
    })
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-xs font-medium text-ls-gray-500">
        Nom
        <input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={fieldInput} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-ls-gray-500">
        Slug
        <input
          required
          value={f.slug}
          onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase() })}
          className={fieldInput}
        />
      </label>
      <label className="flex items-center gap-3 text-xs font-medium text-ls-gray-500">
        Couleur de fond
        <input
          type="color"
          value={f.bgColor}
          onChange={(e) => setF({ ...f, bgColor: e.target.value })}
          className="h-10 w-14 rounded-ls-sm border border-ls-gray-300"
        />
      </label>
      <button type="submit" disabled={pending} className={btnPrimary + ' sm:col-span-2'}>
        Ajouter la catégorie
      </button>
    </form>
  )
}

export function CategoryRow({ row }: { row: Row }) {
  const router = useRouter()
  const [pending, start] = useTransition()

  function act(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    start(async () => {
      const res = await fn()
      if (res.ok) {
        toast.success(okMsg)
        router.refresh()
      } else {
        toast.error(res.error ?? 'Échec')
      }
    })
  }

  const fileRef = useRef<HTMLInputElement>(null)

  function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    act(() => uploadCategoryImage(row.id, formData), 'Image mise en ligne')
    // Permet de re-sélectionner le même fichier après un échec.
    e.target.value = ''
  }

  return (
    <Card className="gap-3">
      <div className="flex items-center gap-3">
        {/* Vignette : l'image si elle existe, sinon la couleur de fond. */}
        <div
          className="relative h-16 w-16 shrink-0 overflow-hidden rounded-ls-sm border border-ls-gray-200"
          style={{ background: row.bgColor }}
        >
          {row.imageUrl && (
            <Image src={row.imageUrl} alt="" fill sizes="64px" className="object-cover" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium text-ls-gray-900">{row.name}</p>
          <p className="text-xs text-ls-gray-500">
            {row.slug} · position {row.position}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => fileRef.current?.click()}
          className={btnOutline}
        >
          <ImageUp size={15} />
          {row.imageUrl ? "Remplacer l'image" : 'Ajouter une image'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickImage} />
        {row.imageUrl && (
          <button
            type="button"
            disabled={pending}
            onClick={() => act(() => updateCategory(row.id, { imageUrl: null }), 'Image retirée')}
            className={btnOutline}
          >
            <X size={15} />
            Retirer l&apos;image
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-ls-gray-100 pt-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => act(() => toggleCategoryVisibility(row.id, !row.visible), 'Visibilité mise à jour')}
          className={
            'inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors disabled:opacity-40 ' +
            (row.visible ? 'bg-ls-success-bg text-ls-success' : 'bg-ls-gray-100 text-ls-gray-500')
          }
        >
          <span className={'h-2 w-2 rounded-full ' + (row.visible ? 'bg-ls-success' : 'bg-ls-gray-400')} />
          {row.visible ? 'Visible' : 'Masquée'}
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm(`Supprimer « ${row.name} » ?`)) act(() => deleteCategory(row.id), 'Supprimée')
          }}
          className={btnDanger + ' ml-auto h-9'}
        >
          <Trash2 size={14} />
          Supprimer
        </button>
      </div>
    </Card>
  )
}
