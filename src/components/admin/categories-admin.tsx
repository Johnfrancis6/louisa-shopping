'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import {
  createCategory,
  toggleCategoryVisibility,
  deleteCategory,
} from '@/lib/actions/admin/categories'
import { Card, fieldInput, btnPrimary, btnDanger } from './ui'

type Row = {
  id: string
  slug: string
  name: string
  bgColor: string
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

  return (
    <Card className="gap-3">
      <div className="flex items-center gap-3">
        <span
          className="h-10 w-10 shrink-0 rounded-ls-sm border border-ls-gray-200"
          style={{ background: row.bgColor }}
        />
        <div className="min-w-0">
          <p className="truncate font-medium text-ls-gray-900">{row.name}</p>
          <p className="text-xs text-ls-gray-500">
            {row.slug} · position {row.position}
          </p>
        </div>
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
