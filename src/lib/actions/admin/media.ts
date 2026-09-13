"use server";

/**
 * src/lib/actions/admin/media.ts
 * CRUD Media (images/vidéos produit) pour le gestionnaire de médias
 * (/admin/products/[id]).
 *
 * - Upload : ImageKit, via la Server Action → limite de corps
 *   `serverActions.bodySizeLimit` (next.config.ts, 8 Mo). OK pour des photos ;
 *   la vidéo demandera un upload signé côté navigateur.
 * - `media.publicId` porte désormais le `fileId` ImageKit. Il est OBLIGATOIRE
 *   pour supprimer : l'URL de livraison ImageKit ne contient pas l'id, on ne
 *   peut pas le redériver. Les lignes héritées (res.cloudinary.com, seed de
 *   démo) restent affichables — le loader gère les deux — mais leur asset
 *   distant n'est plus supprimable d'ici.
 * - « Image principale » = média de plus petite `position` (convention partagée
 *   avec le storefront : data/products.ts, cart.ts trient par position ASC et
 *   prennent le premier). Il n'y a PAS de colonne is_primary.
 * - Garde admin + revalidateTag('products') sur toute mutation.
 */

import { revalidateTag } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { dbAdmin } from "@/lib/db/client";
import { media } from "@/lib/db/schema";
import { getAdminUserId } from "@/lib/auth-guards";
import { deleteImage, uploadImage } from "@/lib/images/imagekit";

type MediaInput = {
  productId: string;
  url: string;
  publicId?: string | null;
  type: "image" | "video";
  alt?: string | null;
};

const DENIED = { ok: false as const, error: "Accès refusé." };
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 Mo

/** Renumérote les positions d'un produit en 0..n-1 dans l'ordre courant. */
async function repackPositions(
  tx: Parameters<Parameters<typeof dbAdmin.transaction>[0]>[0],
  productId: string,
) {
  const rows = await tx
    .select({ id: media.id })
    .from(media)
    .where(eq(media.productId, productId))
    .orderBy(asc(media.position));
  for (let i = 0; i < rows.length; i++) {
    await tx.update(media).set({ position: i }).where(eq(media.id, rows[i].id));
  }
}

export async function addMedia(input: MediaInput) {
  if (!(await getAdminUserId())) return DENIED;

  const existing = await dbAdmin
    .select({ position: media.position })
    .from(media)
    .where(eq(media.productId, input.productId));
  const nextPosition = existing.length
    ? Math.max(...existing.map((m) => m.position)) + 1
    : 0;

  const [row] = await dbAdmin
    .insert(media)
    .values({
      productId: input.productId,
      url: input.url,
      publicId: input.publicId ?? null,
      type: input.type,
      alt: input.alt ?? null,
      position: nextPosition,
    })
    .returning();
  revalidateTag("products");
  return { ok: true as const, media: row };
}

export async function updateMediaAlt(id: string, alt: string) {
  if (!(await getAdminUserId())) return DENIED;

  const [row] = await dbAdmin
    .update(media)
    .set({ alt: alt.trim() || null })
    .where(eq(media.id, id))
    .returning();
  revalidateTag("products");
  return { ok: true as const, media: row };
}

export async function deleteMedia(id: string) {
  if (!(await getAdminUserId())) return DENIED;

  const [row] = await dbAdmin
    .select({ productId: media.productId, url: media.url, publicId: media.publicId, type: media.type })
    .from(media)
    .where(eq(media.id, id))
    .limit(1);
  if (!row) return { ok: false as const, error: "Média introuvable." };

  // Suppression de l'asset distant — best-effort : on ne bloque pas la
  // suppression en base si l'API échoue (la BDD fait foi pour l'affichage).
  if (row.publicId) {
    try {
      await deleteImage(row.publicId);
    } catch (err) {
      console.error("[media] Suppression ImageKit échouée", row.publicId, err);
    }
  } else {
    // Ligne sans fileId (héritage Cloudinary) : rien à appeler, l'id n'est pas
    // dérivable de l'URL.
    console.warn(
      `[media] Asset distant non supprimé (aucun fileId en base) : ${row.url}`,
    );
  }

  await dbAdmin.transaction(async (tx) => {
    await tx.delete(media).where(eq(media.id, id));
    await repackPositions(tx, row.productId);
  });
  revalidateTag("products");
  return { ok: true as const };
}

/**
 * Réordonnancement pour un produit. `orderedIds` DOIT être une permutation
 * exacte des médias du produit (garde-fou contre une liste partielle ou des
 * ids d'un autre produit).
 */
export async function reorderMedia(productId: string, orderedIds: string[]) {
  if (!(await getAdminUserId())) return DENIED;

  const current = await dbAdmin
    .select({ id: media.id })
    .from(media)
    .where(eq(media.productId, productId));
  const currentSet = new Set(current.map((r) => r.id));

  if (
    orderedIds.length !== currentSet.size ||
    !orderedIds.every((id) => currentSet.has(id))
  ) {
    return { ok: false as const, error: "Liste d'ordre invalide." };
  }

  await dbAdmin.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.update(media).set({ position: i }).where(eq(media.id, orderedIds[i]));
    }
  });
  revalidateTag("products");
  return { ok: true as const };
}

/** Place `mediaId` en position 0 (image principale), le reste décalé. */
export async function setPrimaryMedia(productId: string, mediaId: string) {
  if (!(await getAdminUserId())) return DENIED;

  const rows = await dbAdmin
    .select({ id: media.id })
    .from(media)
    .where(eq(media.productId, productId))
    .orderBy(asc(media.position));

  if (!rows.some((r) => r.id === mediaId)) {
    return { ok: false as const, error: "Média introuvable." };
  }

  const ordered = [mediaId, ...rows.map((r) => r.id).filter((id) => id !== mediaId)];
  return reorderMedia(productId, ordered);
}

export async function uploadAndAddMedia(
  productId: string,
  formData: FormData,
  type: "image" | "video",
) {
  if (!(await getAdminUserId())) return DENIED;

  const file = formData.get("file") as File | null;
  if (!file) {
    return { ok: false as const, error: "Aucun fichier fourni." };
  }
  if (type === "image" && !file.type.startsWith("image/")) {
    return { ok: false as const, error: "Le fichier n'est pas une image." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false as const, error: "Fichier trop lourd (max 8 Mo)." };
  }

  if (type === "video") {
    // Pas encore branché : l'upload vidéo passera par une URL signée côté
    // navigateur (les 8 Mo de bodySizeLimit ne suffisent pas). Mieux vaut le
    // dire que d'échouer en vol.
    return {
      ok: false as const,
      error: "L'upload vidéo n'est pas encore branché — utilisez une image.",
    };
  }

  try {
    const uploaded = await uploadImage(file);
    return addMedia({
      productId,
      url: uploaded.url,
      publicId: uploaded.id,
      type,
    });
  } catch (err) {
    console.error("[media] uploadAndAddMedia", err);
    return { ok: false as const, error: "Échec de l'upload ImageKit." };
  }
}
