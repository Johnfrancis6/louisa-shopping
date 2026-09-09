"use server";

/**
 * src/lib/actions/admin/orders.ts
 *
 * Façade Admin : valide le diagramme d'états côté UI (pour désactiver les
 * boutons impossibles) puis délègue à `transitionOrder` (src/lib/actions/
 * orders.ts) qui porte l'autorisation admin, les mutations StockLedger et
 * revalidateTag(). L'Admin ne mute jamais order.status / StockLedger
 * directement ici.
 *
 * TODO (Phase 3) : fusionner cette matrice avec celle de transitionOrder —
 * une seule source de vérité.
 */

import type { OrderStatus } from "@/lib/db/schema";
import { transitionOrder } from "@/lib/actions/orders";
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending_whatsapp: ["confirmed"],
  confirmed:        ["processing", "cancelled"],
  processing:       ["shipped", "cancelled"],
  shipped:          ["delivered", "cancelled"],
  cancelled:        [],
  delivered:        [],
};

export function getAllowedNextStatuses(current: string): string[] {
  return ALLOWED_TRANSITIONS[current] ?? [];
}

export async function requestOrderStatusTransition(
  orderId: string,
  currentStatus: string,
  nextStatus: string
) {
  if (!ALLOWED_TRANSITIONS[currentStatus]?.includes(nextStatus)) {
    return {
      ok: false as const,
      error: `Transition invalide : ${currentStatus} → ${nextStatus}`,
    };
  }

  const result = await transitionOrder(orderId, nextStatus as OrderStatus);
  return { ok: result.success, error: result.error };
}
