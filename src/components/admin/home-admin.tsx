'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'
import { Eye, EyeOff, ImageUp, Trash2 } from 'lucide-react'
import {
  createHomeBlock,
  updateHomeBlock,
  toggleHomeBlockVisibility,
  deleteHomeBlock,
  uploadHomeBlockImage,
  type HomeSlot,
} from '@/lib/actions/admin/home'
import { Card, fieldInput, btnPrimary, btnOutline, btnDanger } from './ui'

/**
 * Éditeur des blocs de la home. Un bloc = un visuel + les textes posés
 * dessus + le lien. Tant qu'un slot n'a aucun bloc visible, le storefront
 * rend son contenu de repli (cf. home-sections.tsx) : rien ne casse.
 */

export type HomeBlockRow = {
  id: string
  slot: HomeSlot
  eyebrow: string | null
  title: string
  body: string | null
  ctaLabel: string | null
  href: string | null
  imageUrl: string | null
  position: number
  visible: boolean
}

/** Ce que chaque slot attend réellement — évite les champs inutiles à l'écran. */
export const SLOT_META: Record<
  HomeSlot,
  { label: string; hint: string; eyebrowLabel?: string; withCta?: boolean }
> = {
  hero: {
    label: 'Bannière (hero)',
    hint: "Un seul bloc visible attendu. Image plein écran, titre et bouton d'appel.",
    withCta: true,
  },
  rail: {
    label: 'Carrousel « Sélections »',
    hint: 'Le titre et l’accroche s’affichent PAR-DESSUS l’image, en haut du bloc.',
  },
  news: {
    label: 'Actualités',
    hint: 'Le sur-titre sert de date.',
    eyebrowLabel: 'Date',
  },
  process: {
    label: 'Illustrations « Comment ça marche »',
    hint: 'Trois blocs, dans l’ordre des étapes. L’accroche remplace le texte de l’étape.',
  },
}

function useAction() {
  const router = useRouter()
  const [pending, start] = useTransition()

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
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

  return { pending, run }
}

export function HomeBlockCreateForm({ slot }: { slot: HomeSlot }) {
  const meta = SLOT_META[slot]
  const { pending, run } = useAction()
  const empty = { eyebrow: '', title: '', body: '', ctaLabel: '', href: '' }
  const [f, setF] = useState(empty)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    run(async () => {
      const res = await createHomeBlock(slot, f)
      if (res.ok) setF(empty)
      return res
    }, 'Bloc créé — ajoutez son image ci-dessous')
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-xs font-medium text-ls-gray-500 sm:col-span-2">
        Titre
        <input
          required
          value={f.title}
          onChange={(e) => setF({ ...f, title: e.target.value })}
          className={fieldInput}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-ls-gray-500">
        {meta.eyebrowLabel ?? 'Sur-titre'} (optionnel)
        <input
          value={f.eyebrow}
          onChange={(e) => setF({ ...f, eyebrow: e.target.value })}
          className={fieldInput}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-ls-gray-500">
        Lien (ex. /catalogue?categorie=sacs-a-main)
        <input
          value={f.href}
          onChange={(e) => setF({ ...f, href: e.target.value })}
          className={fieldInput}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-ls-gray-500 sm:col-span-2">
        Accroche (optionnel)
        <input
          value={f.body}
          onChange={(e) => setF({ ...f, body: e.target.value })}
          className={fieldInput}
        />
      </label>

      {meta.withCta && (
        <label className="flex flex-col gap-1 text-xs font-medium text-ls-gray-500 sm:col-span-2">
          Libellé du bouton
          <input
            value={f.ctaLabel}
            onChange={(e) => setF({ ...f, ctaLabel: e.target.value })}
            className={fieldInput}
          />
        </label>
      )}

      <button type="submit" disabled={pending} className={btnPrimary + ' sm:col-span-2'}>
        Ajouter le bloc
      </button>
    </form>
  )
}

export function HomeBlockCard({ row }: { row: HomeBlockRow }) {
  const meta = SLOT_META[row.slot]
  const { pending, run } = useAction()
  const fileRef = useRef<HTMLInputElement>(null)
  const [f, setF] = useState({
    eyebrow: row.eyebrow ?? '',
    title: row.title,
    body: row.body ?? '',
    ctaLabel: row.ctaLabel ?? '',
    href: row.href ?? '',
  })

  function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    run(() => uploadHomeBlockImage(row.id, formData), 'Image mise en ligne')
    // Permet de re-sélectionner le même fichier après un échec.
    e.target.value = ''
  }

  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-ls-sm bg-ls-gray-100">
          {row.imageUrl ? (
            <Image
              src={row.imageUrl}
              alt=""
              fill
              sizes="80px"
              className="object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center text-[11px] text-ls-gray-400">
              Sans image
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ls-gray-900">{row.title}</p>
          <p className="mt-0.5 text-xs text-ls-gray-500">
            Position {row.position} · {row.visible ? 'visible' : 'masqué'}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => fileRef.current?.click()}
              className={btnOutline}
            >
              <ImageUp size={15} />
              {row.imageUrl ? "Remplacer l'image" : 'Ajouter une image'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={pickImage}
            />
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(
                  () => toggleHomeBlockVisibility(row.id, !row.visible),
                  row.visible ? 'Bloc masqué' : 'Bloc affiché',
                )
              }
              className={btnOutline}
            >
              {row.visible ? <EyeOff size={15} /> : <Eye size={15} />}
              {row.visible ? 'Masquer' : 'Afficher'}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => deleteHomeBlock(row.id), 'Bloc supprimé')}
              className={btnDanger}
            >
              <Trash2 size={15} />
              Supprimer
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-2 border-t border-ls-gray-200 pt-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-ls-gray-500 sm:col-span-2">
          Titre
          <input
            value={f.title}
            onChange={(e) => setF({ ...f, title: e.target.value })}
            className={fieldInput}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-ls-gray-500">
          {meta.eyebrowLabel ?? 'Sur-titre'}
          <input
            value={f.eyebrow}
            onChange={(e) => setF({ ...f, eyebrow: e.target.value })}
            className={fieldInput}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-ls-gray-500">
          Lien
          <input
            value={f.href}
            onChange={(e) => setF({ ...f, href: e.target.value })}
            className={fieldInput}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-ls-gray-500 sm:col-span-2">
          Accroche
          <input
            value={f.body}
            onChange={(e) => setF({ ...f, body: e.target.value })}
            className={fieldInput}
          />
        </label>
        {meta.withCta && (
          <label className="flex flex-col gap-1 text-xs font-medium text-ls-gray-500 sm:col-span-2">
            Libellé du bouton
            <input
              value={f.ctaLabel}
              onChange={(e) => setF({ ...f, ctaLabel: e.target.value })}
              className={fieldInput}
            />
          </label>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => updateHomeBlock(row.id, f), 'Bloc enregistré')}
          className={btnPrimary + ' sm:col-span-2'}
        >
          Enregistrer
        </button>
      </div>
    </Card>
  )
}
