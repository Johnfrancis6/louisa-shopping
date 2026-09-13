"use server";

/**
 * src/lib/actions/admin/home.ts
 * CRUD des blocs éditoriaux de la home (`home_block`) — hero, carrousel
 * « Sélections », actualités, illustrations du parcours.
 *
 * L'image part sur ImageKit : on stocke l'URL de livraison (ce que rend le
 * storefront) ET le `fileId` (seul moyen de supprimer l'asset distant — l'URL
 * ImageKit ne contient pas l'id).
 * Remplacer l'image d'un bloc supprime l'ancienne — sinon le compte se
 * remplit d'orphelines que personne ne retrouvera.
 *
 * Garde admin + revalidateTag('home') sur toute mutation.
 */

import { revalidateTag } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { dbAdmin } from "@/lib/db/client";
import { homeBlock } from "@/lib/db/schema";
import { getAdminUserId } from "@/lib/auth-guards";
import { deleteImage, uploadImage } from "@/lib/images/imagekit";

export type HomeSlot = "hero" | "rail" | "news" | "process";

type HomeBlockInput = {
  eyebrow?: string | null;
  title: string;
  body?: string | null;
  ctaLabel?: string | null;
  href?: string | null;
};

const DENIED = { ok: false as const, error: "Accès refusé." };
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 Mo — aligné sur bodySizeLimit

function bump(slot?: HomeSlot) {
  revalidateTag("home");
  if (slot) revalidateTag(`home:${slot}`);
}

/** Vide -> null : évite d'écrire des chaînes vides qui s'afficheraient. */
function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export async function createHomeBlock(slot: HomeSlot, input: HomeBlockInput) {
  if (!(await getAdminUserId())) return DENIED;

  const title = clean(input.title);
  if (!title) return { ok: false as const, error: "Le titre est obligatoire." };

  const existing = await dbAdmin
    .select({ position: homeBlock.position })
    .from(homeBlock)
    .where(eq(homeBlock.slot, slot));
  const nextPosition = existing.length
    ? Math.max(...existing.map((b) => b.position)) + 1
    : 0;

  const [row] = await dbAdmin
    .insert(homeBlock)
    .values({
      slot,
      title,
      eyebrow: clean(input.eyebrow),
      body: clean(input.body),
      ctaLabel: clean(input.ctaLabel),
      href: clean(input.href),
      position: nextPosition,
    })
    .returning();

  bump(slot);
  return { ok: true as const, block: row };
}

export async function updateHomeBlock(id: string, input: Partial<HomeBlockInput>) {
  if (!(await getAdminUserId())) return DENIED;

  if (input.title !== undefined && !clean(input.title)) {
    return { ok: false as const, error: "Le titre est obligatoire." };
  }

  const [row] = await dbAdmin
    .update(homeBlock)
    .set({
      ...(input.title !== undefined ? { title: clean(input.title)! } : {}),
      ...(input.eyebrow !== undefined ? { eyebrow: clean(input.eyebrow) } : {}),
      ...(input.body !== undefined ? { body: clean(input.body) } : {}),
      ...(input.ctaLabel !== undefined ? { ctaLabel: clean(input.ctaLabel) } : {}),
      ...(input.href !== undefined ? { href: clean(input.href) } : {}),
      updatedAt: new Date(),
    })
    .where(eq(homeBlock.id, id))
    .returning();

  if (!row) return { ok: false as const, error: "Bloc introuvable." };
  bump(row.slot as HomeSlot);
  return { ok: true as const, block: row };
}

export async function toggleHomeBlockVisibility(id: string, visible: boolean) {
  if (!(await getAdminUserId())) return DENIED;

  const [row] = await dbAdmin
    .update(homeBlock)
    .set({ visible, updatedAt: new Date() })
    .where(eq(homeBlock.id, id))
    .returning({ slot: homeBlock.slot });

  if (!row) return { ok: false as const, error: "Bloc introuvable." };
  bump(row.slot as HomeSlot);
  return { ok: true as const };
}

export async function deleteHomeBlock(id: string) {
  if (!(await getAdminUserId())) return DENIED;

  const [row] = await dbAdmin
    .select({ slot: homeBlock.slot, imageId: homeBlock.imageId })
    .from(homeBlock)
    .where(eq(homeBlock.id, id))
    .limit(1);
  if (!row) return { ok: false as const, error: "Bloc introuvable." };

  // Best-effort : un échec côté ImageKit ne doit pas bloquer la suppression
  // en base (c'est la base qui pilote l'affichage).
  if (row.imageId) {
    try {
      await deleteImage(row.imageId);
    } catch (err) {
      console.error("[admin/home] Suppression image échouée", row.imageId, err);
    }
  }

  await dbAdmin.delete(homeBlock).where(eq(homeBlock.id, id));
  bump(row.slot as HomeSlot);
  return { ok: true as const };
}

/** Réordonnancement d'un slot — `orderedIds` doit être une permutation exacte. */
export async function reorderHomeBlocks(slot: HomeSlot, orderedIds: string[]) {
  if (!(await getAdminUserId())) return DENIED;

  const current = await dbAdmin
    .select({ id: homeBlock.id })
    .from(homeBlock)
    .where(eq(homeBlock.slot, slot))
    .orderBy(asc(homeBlock.position));
  const currentSet = new Set(current.map((r) => r.id));

  if (
    orderedIds.length !== currentSet.size ||
    !orderedIds.every((id) => currentSet.has(id))
  ) {
    return { ok: false as const, error: "Liste d'ordre invalide." };
  }

  await dbAdmin.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(homeBlock)
        .set({ position: i, updatedAt: new Date() })
        .where(eq(homeBlock.id, orderedIds[i]));
    }
  });

  bump(slot);
  return { ok: true as const };
}

/**
 * Téléverse (ou remplace) le visuel d'un bloc.
 * L'ancienne image est supprimée APRÈS que la nouvelle soit en base : si
 * l'upload échoue, le bloc garde son visuel actuel.
 */
export async function uploadHomeBlockImage(id: string, formData: FormData) {
  if (!(await getAdminUserId())) return DENIED;

  const file = formData.get("file") as File | null;
  if (!file) return { ok: false as const, error: "Aucun fichier fourni." };
  if (!file.type.startsWith("image/")) {
    return { ok: false as const, error: "Le fichier n'est pas une image." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false as const, error: "Fichier trop lourd (max 8 Mo)." };
  }

  const [current] = await dbAdmin
    .select({ slot: homeBlock.slot, imageId: homeBlock.imageId })
    .from(homeBlock)
    .where(eq(homeBlock.id, id))
    .limit(1);
  if (!current) return { ok: false as const, error: "Bloc introuvable." };

  let uploaded: { id: string; url: string };
  try {
    uploaded = await uploadImage(file);
  } catch (err) {
    console.error("[admin/home] uploadHomeBlockImage", err);
    return { ok: false as const, error: "Échec de l'upload ImageKit." };
  }

  await dbAdmin
    .update(homeBlock)
    .set({ imageUrl: uploaded.url, imageId: uploaded.id, updatedAt: new Date() })
    .where(eq(homeBlock.id, id));

  if (current.imageId && current.imageId !== uploaded.id) {
    try {
      await deleteImage(current.imageId);
    } catch (err) {
      console.error("[admin/home] Ancienne image non supprimée", current.imageId, err);
    }
  }

  bump(current.slot as HomeSlot);
  return { ok: true as const, imageUrl: uploaded.url };
}
