'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowUp, ArrowDown, Star, Trash2, Upload } from 'lucide-react'
import {
  uploadAndAddMedia,
  reorderMedia,
  setPrimaryMedia,
  deleteMedia,
  updateMediaAlt,
} from '@/lib/actions/admin/media'

type MediaItem = {
  id: string
  url: string
  alt: string | null
  position: number
}

const btn =
  'inline-flex items-center gap-1 rounded border border-ls-gray-300 px-2 py-1 text-xs hover:bg-ls-gray-50 disabled:opacity-40'

export function MediaManager({
  productId,
  images,
}: {
  productId: string
  images: MediaItem[]
}) {
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, start] = useTransition()
  const [uploading, setUploading] = useState(false)

  const ids = images.map((i) => i.id)
  const busy = pending || uploading

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg?: string) {
    start(async () => {
      const res = await fn()
      if (res.ok) {
        if (okMsg) toast.success(okMsg)
        router.refresh()
      } else {
        toast.error(res.error ?? 'Échec')
      }
    })
  }

  async function handleFiles(files: FileList) {
    setUploading(true)
    let added = 0
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      const res = await uploadAndAddMedia(productId, fd, 'image')
      if (res.ok) added++
      else toast.error(`${file.name} : ${res.error ?? 'échec'}`)
    }
    setUploading(false)
    if (fileInput.current) fileInput.current.value = ''
    if (added) {
      toast.success(added > 1 ? `${added} images ajoutées` : 'Image ajoutée')
      router.refresh()
    }
  }

  function move(index: number, dir: -1 | 1) {
    const next = index + dir
    if (next < 0 || next >= ids.length) return
    const reordered = [...ids]
    ;[reordered[index], reordered[next]] = [reordered[next], reordered[index]]
    run(() => reorderMedia(productId, reordered))
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files)
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
          className="inline-flex items-center gap-2 rounded bg-ls-gray-900 px-3 py-2 text-sm text-white disabled:opacity-40"
        >
          <Upload size={15} />
          {uploading ? 'Envoi…' : 'Ajouter des images'}
        </button>
        <p className="mt-1 text-xs text-ls-gray-500">
          JPG/PNG/WebP, 8 Mo max par fichier. La première image est l&apos;image principale.
        </p>
      </div>

      {images.length === 0 ? (
        <p className="rounded border border-dashed border-ls-gray-300 px-3 py-10 text-center text-sm text-ls-gray-400">
          Aucune image pour ce produit.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {images.map((img, index) => (
            <li
              key={img.id}
              className="flex flex-col gap-2 rounded border border-ls-gray-200 bg-white p-2"
            >
              <div className="relative aspect-square overflow-hidden rounded bg-ls-gray-100">
                <Image
                  src={img.url}
                  alt={img.alt ?? ''}
                  fill
                  sizes="(max-width: 640px) 50vw, 200px"
                  className="object-cover"
                />
                {index === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-ls-gray-900/85 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
                    Principale
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className={btn}
                  disabled={busy || index === 0}
                  onClick={() => move(index, -1)}
                  aria-label="Monter"
                >
                  <ArrowUp size={13} />
                </button>
                <button
                  type="button"
                  className={btn}
                  disabled={busy || index === images.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label="Descendre"
                >
                  <ArrowDown size={13} />
                </button>
                {index !== 0 && (
                  <button
                    type="button"
                    className={btn}
                    disabled={busy}
                    onClick={() => run(() => setPrimaryMedia(productId, img.id), 'Image principale définie')}
                  >
                    <Star size={13} />
                    Principale
                  </button>
                )}
              </div>

              <input
                type="text"
                defaultValue={img.alt ?? ''}
                placeholder="Texte alternatif"
                disabled={busy}
                className="w-full rounded border border-ls-gray-300 px-2 py-1 text-xs"
                onBlur={(e) => {
                  const value = e.target.value.trim()
                  if (value !== (img.alt ?? '')) {
                    run(() => updateMediaAlt(img.id, value))
                  }
                }}
              />

              <button
                type="button"
                className={`${btn} justify-center text-red-600 hover:bg-red-50`}
                disabled={busy}
                onClick={() => {
                  if (confirm('Supprimer cette image ? L\'asset Cloudinary sera aussi supprimé.')) {
                    run(() => deleteMedia(img.id), 'Image supprimée')
                  }
                }}
              >
                <Trash2 size={13} />
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
