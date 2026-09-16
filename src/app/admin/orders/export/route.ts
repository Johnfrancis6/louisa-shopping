/**
 * GET /admin/orders/export — export CSV des commandes (brief admin §6).
 * Réservé aux administrateurs — contient des données nominatives client.
 */

import { listOrdersAdmin } from "@/lib/db/admin";
import { getAdminUserId } from "@/lib/auth-guards";
import { readDeliveryAddress } from "@/lib/orders-display";

function csvEscape(value: unknown): string {
  let str = String(value ?? "");
  // Neutralise l'injection de formule : un tableur (Excel, LibreOffice, Sheets)
  // exécute toute cellule commençant par =, +, -, @, tabulation ou retour
  // chariot — or ces champs sont saisis librement par le client (nom de
  // livraison, indications, etc.). L'apostrophe force l'affichage en texte brut.
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export async function GET() {
  if (!(await getAdminUserId())) {
    return new Response("Forbidden", { status: 403 });
  }

  const orders = await listOrdersAdmin();

  const header = ["id", "statut", "client", "telephone", "livraison_nom", "livraison_telephone", "quartier_ville", "indications", "total_fcfa", "frais_livraison", "zone_livraison", "paiement", "ref_whatsapp", "cree_le"];
  const rows = orders.map((o) => {
    const a = readDeliveryAddress(o.deliveryAddress);
    return [
      o.id,
      o.status,
      o.customerName,
      o.customerPhone,
      a?.fullName ?? "",
      a?.phone ?? "",
      a?.city ?? "",
      a?.directions ?? "",
      o.total,
      o.deliveryFee,
      o.deliveryZoneLabel ?? "",
      o.paymentMethod,
      o.whatsappRef ?? "",
      o.createdAt?.toISOString(),
    ]
      .map(csvEscape)
      .join(",");
  });
  const csv = [header.join(","), ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="commandes-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
