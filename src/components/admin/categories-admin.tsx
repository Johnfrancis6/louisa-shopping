'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  createCategory,
  toggleCategoryVisibility,
  deleteCategory,
} from '@/lib/actions/admin/categories'

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
  const [f, setF] = useState({ name: '', slug: '', bgColor: '#EEF2FF' })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    start(async () => {
      const res = await createCategory({ name: f.name, slug: f.slug, bgColor: f.bgColor })
      if (res.ok) {
        toast.success('Catégorie créée')
        setF({ name: '', slug: '', bgColor: '#EEF2FF' })
        router.refresh()
      } else {
        toast.error(res.error ?? 'Échec')
      }
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3 rounded border border-neutral-200 bg-white p-4">
      <label className="flex flex-col gap-1 text-xs">
        Nom
        <input
          required
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        Slug
        <input
          required
          value={f.slug}
          onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase() })}
          className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        Fond (hex)
        <input
          type="color"
          value={f.bgColor}
          onChange={(e) => setF({ ...f, bgColor: e.target.value })}
          className="h-8 w-16 rounded border border-neutral-300"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-40"
      >
        Ajouter
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
    <tr className="border-b border-neutral-100 last:border-0">
      <td className="px-3 py-2">
        <span
          className="inline-block h-4 w-4 rounded border border-neutral-300 align-middle"
          style={{ background: row.bgColor }}
        />
      </td>
      <td className="px-3 py-2">{row.name}</td>
      <td className="px-3 py-2 text-neutral-500">{row.slug}</td>
      <td className="px-3 py-2 text-neutral-500">{row.position}</td>
      <td className="px-3 py-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            act(() => toggleCategoryVisibility(row.id, !row.visible), 'Visibilité mise à jour')
          }
          className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50 disabled:opacity-40"
        >
          {row.visible ? 'Visible' : 'Masquée'}
        </button>
      </td>
      <td className="px-3 py-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm(`Supprimer « ${row.name} » ?`)) act(() => deleteCategory(row.id), 'Supprimée')
          }}
          className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-40"
        >
          Supprimer
        </button>
      </td>
    </tr>
  )
}
