"use server";

/**
 * src/lib/actions/admin/products.ts
 * CRUD Product (hors variantes/médias/tutoriels). Suppression = soft delete
 * (isActive=false) : un DELETE cascaderait sur variant/media/tutorialContent
 * et casserait l'historique orderItem. Garde admin + revalidateTag sur toutes
 * les mutations.
 */

import { revalidateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { dbAdmin } from "@/lib/db/client";
import { product } from "@/lib/db/schema";
import { getAdminUserId } from "@/lib/auth-guards";

type ProductInput = {
  slug: string;
  categoryId: string;
  name: string;
  description?: string | null;
  basePrice: number;
  hasTutorial?: boolean;
  hasPdf?: boolean;
  deliveryZones?: unknown[];
};

const DENIED = { ok: false as const, error: "Accès refusé." };

// 'products' couvre la liste catalogue ET les fiches (le reader détail tague
// aussi 'products'). 'stock' rafraîchit les vues qui affichent la dispo.
function bump() {
  revalidateTag("products");
  revalidateTag("stock");
}

function validatePrice(price: number | undefined): string | null {
  if (price === undefined) return null;
  if (!Number.isInteger(price) || price <= 0) {
    return "Le prix de base doit être un entier FCFA supérieur à 0.";
  }
  return null;
}

export async function createProduct(input: ProductInput) {
  if (!(await getAdminUserId())) return DENIED;

  const priceErr = validatePrice(input.basePrice);
  if (priceErr) return { ok: false as const, error: priceErr };

  try {
    const [row] = await dbAdmin
      .insert(product)
      .values({ ...input, deliveryZones: input.deliveryZones ?? [] })
      .returning();
    bump();
    return { ok: true as const, product: row };
  } catch {
    return { ok: false as const, error: "Slug déjà utilisé ou catégorie invalide." };
  }
}

export async function updateProduct(
  id: string,
  input: Partial<Omit<ProductInput, "slug">>,
) {
  if (!(await getAdminUserId())) return DENIED;

  const priceErr = validatePrice(input.basePrice);
  if (priceErr) return { ok: false as const, error: priceErr };

  const [row] = await dbAdmin
    .update(product)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(product.id, id))
    .returning();
  bump();
  return { ok: true as const, product: row };
}

export async function toggleProductActive(id: string, isActive: boolean) {
  if (!(await getAdminUserId())) return DENIED;

  await dbAdmin
    .update(product)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(product.id, id));
  bump();
  return { ok: true as const };
}
