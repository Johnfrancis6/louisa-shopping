"use server";

/**
 * src/lib/actions/admin/whatsapp-config.ts
 * Édition du singleton WhatsappConfig (id=1, CHECK côté DB — jamais d'insert
 * ici, seulement update). Garde admin + updateTag('whatsapp-config').
 * Si la ligne n'existe pas encore, on l'upsert (id=1).
 */

import { updateTag } from "next/cache";
import { dbAdmin } from "@/lib/db/client";
import { whatsappConfig } from "@/lib/db/schema";
import { getAdminUserId } from "@/lib/auth-guards";

const E164_REGEX = /^\+[1-9]\d{7,14}$/;

export async function updateWhatsappConfig(input: { numero: string; lienWa: string }) {
  if (!(await getAdminUserId())) {
    return { ok: false as const, error: "Accès refusé." };
  }
  if (!E164_REGEX.test(input.numero)) {
    return { ok: false as const, error: "Numéro invalide — format E.164 attendu (ex. +22670000000)." };
  }
  if (!input.lienWa.startsWith("https://wa.me/")) {
    return { ok: false as const, error: "Le lien doit commencer par https://wa.me/" };
  }

  const [row] = await dbAdmin
    .insert(whatsappConfig)
    .values({ id: 1, numero: input.numero, lienWa: input.lienWa })
    .onConflictDoUpdate({
      target: whatsappConfig.id,
      set: { numero: input.numero, lienWa: input.lienWa, updatedAt: new Date() },
    })
    .returning();

  updateTag("whatsapp-config");
  return { ok: true as const, config: row };
}
