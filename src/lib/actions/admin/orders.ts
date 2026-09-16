"use server";

/**
 * src/lib/actions/admin/orders.ts
 * Façade Admin : valide la transition côté UI (source unique :
 * lib/order-transitions.ts) puis délègue à `transitionOrder`, qui porte la
 * garde admin, les mutations StockLedger et updateTag().
 */

import { and, eq, inArray } from "drizzle-orm";
import { transitionOrder } from "@/lib/actions/orders";
import { allowedNextStatuses } from "@/lib/order-transitions";
import { getAdminUserId } from "@/lib/auth-guards";
import { dbAdmin } from "@/lib/db/client";
import { orders } from "@/lib/db/schema";
import { isUuid } from "@/lib/utils/ids";
import type { OrderStatus } from "@/lib/db/schema";

export async function requestOrderStatusTransition(
  orderId: string,
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
) {
  if (!allowedNextStatuses(currentStatus).includes(nextStatus)) {
    return { ok: false as const, error: `Transition invalide : ${currentStatus} → ${nextStatus}` };
  }
  const result = await transitionOrder(orderId, nextStatus);
  return { ok: result.success, error: result.error };
}

const WHATSAPP_REF_MAX = 64;

/**
 * Renseigne (ou efface, si `ref` vide) la référence de l'échange WhatsApp sur
 * une commande — saisie manuelle par le commerçant, aucune API WhatsApp.
 * Autorisée uniquement pending_whatsapp/confirmed : une commande livrée ou
 * annulée est de l'historique figé.
 *
 * Pas de revalidateTag : /admin/orders lit `listOrdersAdmin` (src/lib/db/admin.ts)
 * directement via dbAdmin, sans 'use cache' ni lecteur taggé — `router.refresh()`
 * côté client (cf. order-transitions.tsx) suffit à voir l'écriture.
 */
export async function setOrderWhatsappRef(orderId: string, ref: string) {
  if (!(await getAdminUserId())) {
    return { ok: false as const, error: "Accès refusé" };
  }
  if (!isUuid(orderId)) {
    return { ok: false as const, error: "Commande introuvable" };
  }

  const trimmed = ref.trim().slice(0, WHATSAPP_REF_MAX);
  const value = trimmed.length > 0 ? trimmed : null;

  const rows = await dbAdmin
    .update(orders)
    .set({ whatsappRef: value, updatedAt: new Date() })
    .where(
      and(
        eq(orders.id, orderId),
        inArray(orders.status, ["pending_whatsapp", "confirmed"]),
      ),
    )
    .returning({ id: orders.id });

  if (rows.length === 0) {
    return {
      ok: false as const,
      error: "Commande introuvable, ou déjà livrée/annulée (historique figé)",
    };
  }
  return { ok: true as const };
}
