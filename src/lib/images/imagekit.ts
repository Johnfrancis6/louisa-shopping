import 'server-only'

/**
 * src/lib/images/imagekit.ts
 * Accès à l'API ImageKit — SERVEUR UNIQUEMENT (porte la clé privée).
 *
 * Endpoints (vérifiés sur imagekit.io/docs, septembre 2026) :
 *   POST   https://upload.imagekit.io/api/v1/files/upload   upload multipart
 *   DELETE https://api.imagekit.io/v1/files/<fileId>        suppression
 *
 * Authentification : Basic, la clé privée en NOM D'UTILISATEUR et un mot de
 * passe VIDE — d'où le `:` final avant l'encodage base64.
 *
 * L'URL de livraison est celle que renvoie l'API à l'upload : le code n'a pas
 * besoin de NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT (elle servira le jour où
 * l'upload passera côté navigateur).
 *
 * ⚠️ Contrairement à Cloudinary, l'URL de livraison ne contient PAS le
 * `fileId` : impossible de le redériver après coup. Il faut donc le stocker au
 * moment de l'upload (`media.publicId`, `home_block.imageId`), sinon l'asset
 * distant devient non supprimable.
 */

const UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload'
const API_BASE = 'https://api.imagekit.io/v1'

/** Dossier de destination dans la médiathèque ImageKit. */
const FOLDER = '/louisa-shopping'

export type UploadedImage = {
  /** `fileId` ImageKit — à conserver en base pour pouvoir supprimer. */
  id: string
  /** URL de livraison complète, sans transformation. */
  url: string
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `[images/imagekit] Variable d'environnement manquante : ${name}`,
    )
  }
  return value
}

function authHeader(): string {
  const privateKey = requireEnv('IMAGEKIT_PRIVATE_KEY')
  return `Basic ${Buffer.from(`${privateKey}:`).toString('base64')}`
}

/**
 * Upload depuis le serveur (Server Action admin).
 * Limité par `serverActions.bodySizeLimit` (8 Mo) : suffisant pour des photos,
 * pas pour de la vidéo — celle-ci demandera un upload signé côté navigateur.
 */
export async function uploadImage(file: File): Promise<UploadedImage> {
  const form = new FormData()
  form.append('file', file)
  // `fileName` est obligatoire. `useUniqueFileName` (défaut true) suffixe le
  // nom : deux « photo.jpg » ne s'écrasent pas l'un l'autre.
  form.append('fileName', file.name || 'upload')
  form.append('folder', FOLDER)

  const res = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: { Authorization: authHeader() },
    body: form,
    cache: 'no-store',
  })

  const body = (await res.json().catch(() => null)) as
    | { fileId?: string; url?: string; message?: string }
    | null

  if (!res.ok || !body?.fileId || !body?.url) {
    throw new Error(
      `[images/imagekit] upload — ${body?.message ?? `HTTP ${res.status}`}`,
    )
  }

  return { id: body.fileId, url: body.url }
}

/** Suppression définitive. 204 attendu. */
export async function deleteImage(fileId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/files/${encodeURIComponent(fileId)}`, {
    method: 'DELETE',
    headers: { Authorization: authHeader() },
    cache: 'no-store',
  })

  // 404 = déjà supprimé : on ne considère pas ça comme un échec.
  if (!res.ok && res.status !== 404) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null
    throw new Error(
      `[images/imagekit] delete ${fileId} — ${body?.message ?? `HTTP ${res.status}`}`,
    )
  }
}
