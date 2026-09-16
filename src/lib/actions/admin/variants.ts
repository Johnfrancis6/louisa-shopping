"use server";

/**
 * src/lib/actions/admin/variants.ts
 * CRUD Variant. L'ajustement de stock est ISOLÉ dans sa propre fonction
 * transactionnelle (jamais un simple update de stockQty) pour préserver
 * StockLedger comme source de vérité (contrat §C).
 */

import { revalidateTag } from "next/cache";
import { and, eq, gte, sql } from "drizzle-orm";
import { dbAdmin } from "@/lib/db/client";
import { variant, stockLedger } from "@/lib/db/schema";
import { getAdminUserId } from "@/lib/auth-guards";

type VariantInput = {
  productId: string;
  size?: string | null;
  color?: string | null;
  sku: string;
  priceOverride?: number | null;
};

const DENIED = { ok: false as const, error: "Accès refusé." };

function bump(variantId?: string) {
  revalidateTag("products", { expire: 0 });
  revalidateTag("stock", { expire: 0 });
  if (variantId) revalidateTag(`stock:${variantId}`, { expire: 0 });
}

export async function createVariant(input: VariantInput & { initialStock?: number }) {
  if (!(await getAdminUserId())) return DENIED;

  const initialStock = input.initialStock ?? 0;
  if (!Number.isInteger(initialStock) || initialStock < 0) {
    return { ok: false as const, error: "Le stock initial doit être un entier ≥ 0." };
  }
  if (
    input.priceOverride != null &&
    (!Number.isInteger(input.priceOverride) || input.priceOverride <= 0)
  ) {
    return { ok: false as const, error: "Le prix override doit être un entier FCFA > 0." };
  }

  try {
    // Un seul insert de variante ET un seul insert de ledger, dans la même
    // transaction : si l'écriture du ledger échoue après celle de la
    // variante, on se retrouve avec du stock non tracé — exactement ce que
    // StockLedger comme source de vérité unique doit interdire.
    const row = await dbAdmin.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(variant)
        .values({
          productId: input.productId,
          size: input.size,
          color: input.color,
          sku: input.sku,
          priceOverride: input.priceOverride,
          stockQty: initialStock,
        })
        .returning();

      // Trace la mise en stock initiale dans le ledger pour cohérence totale
      // de l'historique, même à la création.
      if (initialStock > 0) {
        await tx.insert(stockLedger).values({
          variantId: inserted.id,
          delta: initialStock,
          reason: "manual_adjustment",
        });
      }

      return inserted;
    });

    bump(row.id);
    return { ok: true as const, variant: row };
  } catch {
    return { ok: false as const, error: "SKU déjà utilisé." };
  }
}

/** Édition des attributs hors stock (taille, couleur, sku, prix override) */
export async function updateVariant(
  id: string,
  input: Partial<Omit<VariantInput, "productId">>
) {
  if (!(await getAdminUserId())) return DENIED;

  if (
    input.priceOverride != null &&
    (!Number.isInteger(input.priceOverride) || input.priceOverride <= 0)
  ) {
    return { ok: false as const, error: "Le prix override doit être un entier FCFA > 0." };
  }

  // Construction explicite du SET : `input` est du JSON reçu sur une route
  // HTTP — `Partial<Omit<VariantInput, "productId">>` ne filtre rien à
  // l'exécution. `stockQty` et `productId` restent hors liste blanche :
  // seule `adjustVariantStock` (ci-dessous) a le droit d'écrire du stock,
  // pour que StockLedger reste la source de vérité unique des mouvements.
  const [row] = await dbAdmin
    .update(variant)
    .set({
      ...(input.size !== undefined ? { size: input.size } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.sku !== undefined ? { sku: input.sku } : {}),
      ...(input.priceOverride !== undefined ? { priceOverride: input.priceOverride } : {}),
      updatedAt: new Date(),
    })
    .where(eq(variant.id, id))
    .returning();
  bump(id);
  return { ok: true as const, variant: row };
}

/**
 * Ajustement manuel de stock (casse, inventaire, correction) — seule voie
 * autorisée pour modifier stockQty depuis l'Admin. `delta` peut être
 * positif ou négatif ; le solde résultant ne peut jamais être négatif.
 */
export async function adjustVariantStock(variantId: string, delta: number, note?: string) {
  void note; // (réservé pour une future colonne stock_ledger.note)
  if (!(await getAdminUserId())) return DENIED;
  if (!Number.isInteger(delta) || delta === 0) {
    return { ok: false as const, error: "Le delta doit être un entier non nul." };
  }

  const result = await dbAdmin.transaction(async (tx) => {
    // UPDATE atomique : `stock_qty + delta` côté SQL, WHERE bloque un solde
    // négatif — 0 ligne retournée = stock insuffisant ou variante inconnue.
    const rows = await tx
      .update(variant)
      .set({ stockQty: sql`${variant.stockQty} + ${delta}`, updatedAt: new Date() })
      .where(
        delta < 0
          ? and(eq(variant.id, variantId), gte(variant.stockQty, -delta))
          : eq(variant.id, variantId),
      )
      .returning({ stockQty: variant.stockQty });

    if (rows.length === 0) {
      return {
        ok: false as const,
        error: "Variante introuvable ou stock insuffisant pour cet ajustement.",
      };
    }

    await tx.insert(stockLedger).values({
      variantId,
      delta,
      reason: "manual_adjustment",
    });

    return { ok: true as const, newQty: rows[0].stockQty };
  });

  if (result.ok) bump(variantId);
  return result;
}