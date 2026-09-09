/**
 * GET /admin/orders/export — export CSV des commandes (brief admin §6).
 * Réservé aux administrateurs — contient des données nominatives client.
 */

import { listOrdersAdmin } from "@/lib/db/admin";
import { getAdminUserId } from "@/lib/auth-guards";

function csvEscape(value: unknown): string {
  const str = String(value ?? "");
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export async function GET() {
  if (!(await getAdminUserId())) {
    return new Response("Forbidden", { status: 403 });
  }

  const orders = await listOrdersAdmin();

  const header = ["id", "statut", "client", "telephone", "total_fcfa", "paiement", "ref_whatsapp", "cree_le"];
  const rows = orders.map((o) =>
    [o.id, o.status, o.customerName, o.customerPhone, o.total, o.paymentMethod, o.whatsappRef ?? "", o.createdAt?.toISOString()]
      .map(csvEscape)
      .join(",")
  );
  const csv = [header.join(","), ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="commandes-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
