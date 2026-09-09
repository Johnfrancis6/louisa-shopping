"use server";

/**
 * src/lib/actions/admin/media.ts
 * CRUD Media (images/vidéos produit). `uploadAndAddMedia` passe par une Server
 * Action → limite de corps ~4,5 Mo (défaut Next) : OK pour des images, à
 * remplacer par un upload signé direct-vers-Cloudinary pour les vidéos
 * (Phase 3). Garde admin + revalidateTag('products') sur toute mutation.
 */

import { revalidateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { v2 as cloudinary } from "cloudinary";
import { dbAdmin } from "@/lib/db/client";
import { media } from "@/lib/db/schema";
import { getAdminUserId } from "@/lib/auth-guards";

type MediaInput = {
  productId: string;
  url: string;
  type: "image" | "video";
  alt?: string | null;
};

const DENIED = { ok: false as const, error: "Accès refusé." };

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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
    .values({ ...input, position: nextPosition })
    .returning();
  revalidateTag("products");
  return { ok: true as const, media: row };
}

export async function updateMediaAlt(id: string, alt: string) {
  if (!(await getAdminUserId())) return DENIED;

  const [row] = await dbAdmin
    .update(media)
    .set({ alt })
    .where(eq(media.id, id))
    .returning();
  revalidateTag("products");
  return { ok: true as const, media: row };
}

export async function deleteMedia(id: string) {
  if (!(await getAdminUserId())) return DENIED;

  await dbAdmin.delete(media).where(eq(media.id, id));
  revalidateTag("products");
  return { ok: true as const };
}

/** Réordonnancement drag-and-drop pour un produit donné, écrit atomiquement. */
export async function reorderMedia(orderedIds: string[]) {
  if (!(await getAdminUserId())) return DENIED;

  await dbAdmin.transaction(async (tx) => {
    for (let index = 0; index < orderedIds.length; index++) {
      await tx.update(media).set({ position: index }).where(eq(media.id, orderedIds[index]));
    }
  });
  revalidateTag("products");
  return { ok: true as const };
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

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploaded = await new Promise<{ secure_url: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { resource_type: type === "video" ? "video" : "image", folder: "louisa-shopping/products" },
        (err, result) => (err || !result ? reject(err) : resolve(result)),
      )
      .end(buffer);
  }).catch(() => null);

  if (!uploaded) {
    return { ok: false as const, error: "Échec de l'upload Cloudinary." };
  }

  return addMedia({ productId, url: uploaded.secure_url, type });
}
