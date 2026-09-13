"use server";

/**
 * src/lib/actions/admin/reviews.ts
 * Modération des avis. Un avis n'est visible publiquement qu'en status
 * 'approved' (policy RLS). Garde admin + updateTag(`reviews:${productId}`).
 */

import { updateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { dbAdmin } from "@/lib/db/client";
import { review } from "@/lib/db/schema";
import { getAdminUserId } from "@/lib/auth-guards";

const DENIED = { ok: false as const, error: "Accès refusé." };

async function setStatus(id: string, status: "approved" | "rejected") {
  if (!(await getAdminUserId())) return DENIED;

  const [row] = await dbAdmin
    .update(review)
    .set({ status })
    .where(eq(review.id, id))
    .returning({ productId: review.productId });

  if (!row) return { ok: false as const, error: "Avis introuvable." };
  updateTag(`reviews:${row.productId}`);
  return { ok: true as const };
}

export async function approveReview(id: string) {
  return setStatus(id, "approved");
}

export async function rejectReview(id: string) {
  return setStatus(id, "rejected");
}
