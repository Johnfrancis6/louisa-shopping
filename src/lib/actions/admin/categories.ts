"use server";

/**
 * src/lib/actions/admin/categories.ts
 * CRUD + réordonnancement Category. Validation contraste WCAG AA bloquante
 * avant tout insert/update de bg_color. Toutes les actions : garde admin +
 * revalidateTag('categories').
 */

import { revalidateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { dbAdmin } from "@/lib/db/client";
import { category } from "@/lib/db/schema";
import { validateCategoryBgColor } from "@/lib/utils/contrast";
import { getAdminUserId } from "@/lib/auth-guards";

type CategoryInput = {
  slug: string;
  name: string;
  bgColor: string;
  imageUrl?: string | null;
  parentId?: string | null;
};

const DENIED = { ok: false as const, error: "Accès refusé." };

function bump() {
  revalidateTag("categories");
}

export async function createCategory(input: CategoryInput) {
  if (!(await getAdminUserId())) return DENIED;

  const contrast = validateCategoryBgColor(input.bgColor);
  if (!contrast.valid) {
    return {
      ok: false as const,
      error: `Contraste insuffisant (${contrast.ratio}:1, minimum ${contrast.min}:1) — choisissez une couleur plus foncée.`,
    };
  }

  try {
    const [row] = await dbAdmin.insert(category).values(input).returning();
    bump();
    return { ok: true as const, category: row };
  } catch {
    return { ok: false as const, error: "Slug déjà utilisé ou catégorie parente invalide." };
  }
}

export async function updateCategory(id: string, input: Partial<CategoryInput>) {
  if (!(await getAdminUserId())) return DENIED;

  if (input.bgColor) {
    const contrast = validateCategoryBgColor(input.bgColor);
    if (!contrast.valid) {
      return {
        ok: false as const,
        error: `Contraste insuffisant (${contrast.ratio}:1, minimum ${contrast.min}:1).`,
      };
    }
  }

  const [row] = await dbAdmin
    .update(category)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(category.id, id))
    .returning();
  bump();
  return { ok: true as const, category: row };
}

export async function toggleCategoryVisibility(id: string, visible: boolean) {
  if (!(await getAdminUserId())) return DENIED;

  await dbAdmin
    .update(category)
    .set({ visible, updatedAt: new Date() })
    .where(eq(category.id, id));
  bump();
  return { ok: true as const };
}

export async function deleteCategory(id: string) {
  if (!(await getAdminUserId())) return DENIED;

  // product.category_id est onDelete: restrict — la FK bloque la suppression
  // d'une catégorie non vide, on relaie l'erreur.
  try {
    await dbAdmin.delete(category).where(eq(category.id, id));
    bump();
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error: "Impossible de supprimer : des produits sont encore rattachés à cette catégorie.",
    };
  }
}

/** Réordonnancement drag-and-drop — liste ordonnée des ids, écrite atomiquement. */
export async function reorderCategories(orderedIds: string[]) {
  if (!(await getAdminUserId())) return DENIED;

  await dbAdmin.transaction(async (tx) => {
    for (let index = 0; index < orderedIds.length; index++) {
      await tx
        .update(category)
        .set({ position: index, updatedAt: new Date() })
        .where(eq(category.id, orderedIds[index]));
    }
  });
  bump();
  return { ok: true as const };
}
