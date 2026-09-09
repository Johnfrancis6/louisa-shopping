import { ORDER_STATUS_LABELS } from "@/lib/orders-display";
import type { OrderStatus } from "@/lib/db/schema";

const STYLES: Record<string, string> = {
  pending_whatsapp: "bg-amber-100 text-amber-800",
  confirmed: "bg-sky-100 text-sky-800",
  processing: "bg-indigo-100 text-indigo-800",
  shipped: "bg-violet-100 text-violet-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export function OrderStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded px-2 py-[2px] text-xs font-medium ${STYLES[status] ?? "bg-neutral-100 text-neutral-700"}`}
    >
      {ORDER_STATUS_LABELS[status as OrderStatus] ?? status}
    </span>
  );
}
