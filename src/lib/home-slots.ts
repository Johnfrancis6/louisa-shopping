/**
 * src/lib/home-slots.ts
 * Emplacements éditoriaux de la home + leurs libellés d'admin.
 *
 * Module NEUTRE, sans directive : il est lu par la page serveur
 * (src/app/admin/home/page.tsx) ET par l'éditeur client
 * (src/components/admin/home-admin.tsx).
 *
 * ⚠️ Ne jamais redéplacer SLOT_META dans un fichier `'use client'` : en RSC,
 * TOUT export d'un module client devient une référence client, et un composant
 * serveur qui fait `SLOT_META[slot].label` dessus lève à l'exécution
 * (« You cannot dot into a client module from a server component »). Le build
 * ne l'attrape pas : /admin/home est rendu à la demande, jamais prérendu.
 */

export type HomeSlot = "hero" | "rail" | "news" | "process";

export const SLOT_ORDER: HomeSlot[] = ["hero", "rail", "news", "process"];

/** Ce que chaque slot attend réellement — évite les champs inutiles à l'écran. */
export const SLOT_META: Record<
  HomeSlot,
  { label: string; hint: string; eyebrowLabel?: string; withCta?: boolean }
> = {
  hero: {
    label: "Bannière (hero)",
    hint: "Un seul bloc visible attendu. Image plein écran, titre et bouton d'appel.",
    withCta: true,
  },
  rail: {
    label: "Carrousel « Sélections »",
    hint: "Le titre et l’accroche s’affichent PAR-DESSUS l’image, en haut du bloc.",
  },
  news: {
    label: "Actualités",
    hint: "Le sur-titre sert de date.",
    eyebrowLabel: "Date",
  },
  process: {
    label: "Illustrations « Comment ça marche »",
    hint: "Trois blocs, dans l’ordre des étapes. L’accroche remplace le texte de l’étape.",
  },
};
