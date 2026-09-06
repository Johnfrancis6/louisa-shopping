/**
 * lib/db/seed.ts
 * Seed de dev — exécuter uniquement via dbAdmin (bypass RLS).
 *
 * ⚠️ ÉCART SIGNALÉ (voir réponse, section "Écart détecté") :
 * le brief demande "au minimum les 10 catégories déjà définies", mais
 * aucune liste de 10 catégories n'existe dans le drive — le seul document
 * source (00-brief/brief-original.md, v1 antérieure au contrat v2.3) n'en
 * définit que 4 racines + 2 sous-catégories (Vêtements > Homme/Femme),
 * soit 6. `04-agent-ui/ui-reference.md` liste lui-même ce point comme
 * "À confirmer" ("Liste réelle des catégories initiales").
 * => Ce seed contient donc les 6 catégories confirmées, structurées pour
 * qu'ajouter les 4 manquantes soit trivial (aucune contrainte de nombre
 * dans le schéma). À COMPLÉTER dès que la liste officielle est fournie.
 */

import { dbAdmin } from "./client";
import { category, zone, whatsappConfig } from "./schema";

async function main() {
  // ---------------------------------------------------------------------
  // Catégories racines
  // ---------------------------------------------------------------------
  const [electromenager, sacs, velos, vetements] = await dbAdmin
    .insert(category)
    .values([
      {
        slug: "electromenager",
        name: "Électroménager",
        bgColor: "#EEF2FF",
        position: 1,
        visible: true,
      },
      {
        slug: "sacs",
        name: "Sacs à main",
        bgColor: "#FDF2F8",
        position: 2,
        visible: true,
      },
      {
        slug: "velos",
        name: "Vélos de sport",
        bgColor: "#ECFDF5",
        position: 3,
        visible: true,
      },
      {
        slug: "vetements",
        name: "Vêtements",
        bgColor: "#FFF7ED",
        position: 4,
        visible: true,
      },
    ])
    .returning();

  // ---------------------------------------------------------------------
  // Sous-catégories (self-join) — Vêtements > Homme / Femme
  // ---------------------------------------------------------------------
  await dbAdmin.insert(category).values([
    {
      slug: "vetements-homme",
      name: "Homme",
      parentId: vetements.id,
      bgColor: "#FFF7ED",
      position: 1,
      visible: true,
    },
    {
      slug: "vetements-femme",
      name: "Femme",
      parentId: vetements.id,
      bgColor: "#FFF7ED",
      position: 2,
      visible: true,
    },
  ]);

  // ---------------------------------------------------------------------
  // Zones — table de référence légère, hybride avec product.delivery_zones
  // Placeholder Ouagadougou uniquement (zones réelles = point ouvert,
  // cf. brief-original §10.5 "Zones de livraison couvertes — Bloquant : Oui")
  // ---------------------------------------------------------------------
  await dbAdmin.insert(zone).values([
    { nom: "Ouagadougou", fraisBase: 1500 },
  ]);

  // ---------------------------------------------------------------------
  // Configuration WhatsApp — placeholder, à remplacer depuis l'admin
  // (numéro non hardcodé en dur dans le code applicatif, uniquement en base)
  // ---------------------------------------------------------------------
  await dbAdmin.insert(whatsappConfig).values({
    id: 1,
    phoneNumber: "+22600000000", // placeholder — à définir par le propriétaire produit (brief G2)
  });

  console.log("Seed terminé : 6 catégories, 1 zone, 1 config WhatsApp.");
}

main()
  .catch((err) => {
    console.error("Échec du seed :", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));