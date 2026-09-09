"use server";

/**
 * src/lib/actions/admin/media.ts
 * CRUD Media (images/vidéos produit) pour le gestionnaire de médias
 * (/admin/products/[id]).
 *
 * - Upload : passe par la Server Action → limite de corps `serverActions.
 *   bodySizeLimit` (next.config.ts, 8 Mo). OK pour des photos ; pour les vidéos,
 *   à remplacer par un upload signé direct-vers-Cloudinary.
 * - « Image principale » = média de plus petite `position` (convention partagée
 *   avec le storefront : data/products.ts, cart.ts trient par position ASC et
 *   prennent le premier). Il n'y a PAS de colonne is_primary.
 * - Garde admin + revalidateTag('products') sur toute mutation.
 */

import { revalidateTag } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { v2 as cloudinary } from "cloudinary";
import { dbAdmin } from "@/lib/db/client";
import { media } from "@/lib/db/schema";
import { getAdminUserId } from "@/lib/auth-guards";

type MediaInput = {
  productId: string;
  url: string;
  publicId?: string | null;
  type: "image" | "video";
  alt?: string | null;
};

const DENIED = { ok: false as const, error: "Accès refusé." };
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 Mo

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Dérive le public_id Cloudinary d'une URL "delivery" standard, pour les
 * lignes créées avant la colonne `public_id`.
 * ex. https://res.cloudinary.com/x/image/upload/v123/louisa-shopping/products/abc.jpg
 *  -> "louisa-shopping/products/abc"
 */
function publicIdFromUrl(url: string): string | null {
  const m = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z0-9]+)?$/i);
  return m?.[1] ?? null;
}

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
  // suppression en base si Cloudinary échoue (la BDD fait foi pour l'affichage).
  const publicId = row.publicId ?? publicIdFromUrl(row.url);
  if (publicId) {
    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: row.type === "video" ? "video" : "image",
      });
    } catch (err) {
      console.error("[media] Cloudinary destroy échoué", publicId, err);
    }
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

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploaded = await new Promise<{ secure_url: string; public_id: string }>(
    (resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: type === "video" ? "video" : "image",
            folder: "louisa-shopping/products",
          },
          (err, result) => (err || !result ? reject(err) : resolve(result)),
        )
        .end(buffer);
    },
  ).catch(() => null);

  if (!uploaded) {
    return { ok: false as const, error: "Échec de l'upload Cloudinary." };
  }

  return addMedia({
    productId,
    url: uploaded.secure_url,
    publicId: uploaded.public_id,
    type,
  });
}
