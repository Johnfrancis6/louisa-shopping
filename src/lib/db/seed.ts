/**
 * src/lib/db/seed.ts
 * Seed de dev — exécuter uniquement via dbAdmin (bypass RLS).
 *
 * Catégories : source = 01-architecture/categories.md (contrat v2.5),
 * référentiel officiel à 10 catégories qui remplace la liste provisoire à
 * 6 catégories utilisée dans la version précédente de ce seed.
 * `slug` et `image_url` ne sont pas fournis par categories.md — slugs
 * générés ici (kebab-case), `image_url` laissé null (à renseigner par
 * l'Admin ou un futur script d'import média).
 */

import { config } from "dotenv";
import { dbAdmin } from "./client";
import { category, zone, whatsappConfig } from "./schema";

// tsx (contrairement à drizzle-kit) ne charge PAS .env/.env.local
// automatiquement — chargement explicite requis avant tout appel dbAdmin.
config({ path: ".env" });
config({ path: ".env.local", override: true });

const CATEGORIES_V2_5 = [
  { slug: "electromenager", name: "Électroménager", bgColor: "#DCEAF7", position: 1 },
  { slug: "sacs-a-main", name: "Sacs à main", bgColor: "#F3E1E6", position: 2 },
  { slug: "fitness-velos-de-sport", name: "Fitness (vélos de sport)", bgColor: "#DFF3E6", position: 3 },
  { slug: "vetements-homme", name: "Vêtements Homme", bgColor: "#E6E3F5", position: 4 },
  { slug: "vetements-femme", name: "Vêtements Femme", bgColor: "#FCE7F3", position: 5 },
  { slug: "etageres", name: "Étagères", bgColor: "#EFE6DA", position: 6 },
  { slug: "sacs-isothermes", name: "Sacs isothermes", bgColor: "#D9F0EF", position: 7 },
  { slug: "tenues-fillettes", name: "Tenues fillettes", bgColor: "#FDEEDC", position: 8 },
  { slug: "plats", name: "Plats", bgColor: "#F7E9D7", position: 9 },
  { slug: "climatiseurs", name: "Climatiseurs", bgColor: "#DDEEF7", position: 10 },
] as const;

async function main() {
  // ---------------------------------------------------------------------
  // Catégories — référentiel officiel à 10 catégories (categories.md).
  // Liste plate : categories.md ne définit pas de hiérarchie parent/enfant
  // (contrairement à l'ancien seed provisoire "Vêtements > Homme/Femme") ;
  // Vêtements Homme et Vêtements Femme sont deux catégories racines
  // distinctes. parent_id reste utilisable plus tard (self-join conservé
  // au schéma) si une hiérarchie est réintroduite.
  // ---------------------------------------------------------------------
  await dbAdmin.insert(category).values(
    CATEGORIES_V2_5.map((c) => ({
      slug: c.slug,
      name: c.name,
      bgColor: c.bgColor,
      position: c.position,
      visible: true,
    }))
  );

  // ---------------------------------------------------------------------
  // Zones — placeholder Ouagadougou uniquement (zones réelles = point
  // ouvert, cf. brief-original §10.5 "Zones de livraison couvertes")
  // ---------------------------------------------------------------------
  await dbAdmin.insert(zone).values([
    { nom: "Ouagadougou", fraisBase: 1500 },
  ]);

  // ---------------------------------------------------------------------
  // Configuration WhatsApp — placeholder, à remplacer depuis l'admin.
  // Champs contrat v2.5 : numero + lien_wa (pas un simple phone_number).
  // ---------------------------------------------------------------------
  await dbAdmin.insert(whatsappConfig).values({
    id: 1,
    numero: "+22600000000", // placeholder — à définir par le propriétaire produit (brief G2)
    lienWa: "https://wa.me/22600000000", // placeholder, cohérent avec `numero`
  });

  console.log("Seed terminé : 10 catégories, 1 zone, 1 config WhatsApp.");
}

main()
  .catch((err) => {
    console.error("Échec du seed :", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));