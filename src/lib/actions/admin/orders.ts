"use server";

/**
 * src/lib/actions/admin/orders.ts
 * Façade Admin : valide la transition côté UI (source unique :
 * lib/order-transitions.ts) puis délègue à `transitionOrder`, qui porte la
 * garde admin, les mutations StockLedger et revalidateTag().
 */

import { transitionOrder } from "@/lib/actions/orders";
import { allowedNextStatuses } from "@/lib/order-transitions";
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
