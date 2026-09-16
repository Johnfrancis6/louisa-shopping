"use server";

/**
 * src/lib/actions/admin/products.ts
 * CRUD Product (hors variantes/médias/tutoriels). Suppression = soft delete
 * (isActive=false) : un DELETE cascaderait sur variant/media/tutorialContent
 * et casserait l'historique orderItem. Garde admin + updateTag sur toutes
 * les mutations.
 */

import { revalidateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { dbAdmin } from "@/lib/db/client";
import { product } from "@/lib/db/schema";
import { getAdminUserId } from "@/lib/auth-guards";

type ProductInput = {
  slug: string;
  categoryId: string;
  name: string;
  description?: string | null;
  basePrice: number;
  hasTutorial?: boolean;
  hasPdf?: boolean;
  deliveryZones?: unknown[];
};

const DENIED = { ok: false as const, error: "Accès refusé." };

// 'products' couvre la liste catalogue ET les fiches (le reader détail tague
// aussi 'products'). 'stock' rafraîchit les vues qui affichent la dispo.
function bump() {
  revalidateTag("products", { expire: 0 });
  revalidateTag("stock", { expire: 0 });
}

/**
 * Le nom est `notNull` en base mais rien n'empêchait d'y écrire une chaîne
 * vide — ce qui donne un produit sans titre dans la vitrine. Vérifié ici,
 * maintenant que le nom est modifiable après coup.
 */
function validateName(name: string | undefined): string | null {
  if (name === undefined) return null;
  if (name.trim().length === 0) {
    return "Le nom du produit ne peut pas être vide.";
  }
  return null;
}

function validatePrice(price: number | undefined): string | null {
  if (price === undefined) return null;
  if (!Number.isInteger(price) || price <= 0) {
    return "Le prix de base doit être un entier FCFA supérieur à 0.";
  }
  return null;
}

export async function createProduct(input: ProductInput) {
  if (!(await getAdminUserId())) return DENIED;

  const nameErr = validateName(input.name);
  if (nameErr) return { ok: false as const, error: nameErr };

  const priceErr = validatePrice(input.basePrice);
  if (priceErr) return { ok: false as const, error: priceErr };

  try {
    // Construction explicite : une Server Action reçoit du JSON brut, pas un
    // objet typé — `ProductInput` ne filtre rien à l'exécution. On énumère
    // ici les seules colonnes pilotables par le client à la création ;
    // `isActive`/`createdAt`/`updatedAt` restent sous le contrôle du serveur.
    const [row] = await dbAdmin
      .insert(product)
      .values({
        slug: input.slug,
        categoryId: input.categoryId,
        name: input.name.trim(),
        description: input.description ?? null,
        basePrice: input.basePrice,
        hasTutorial: input.hasTutorial ?? false,
        hasPdf: input.hasPdf ?? false,
        deliveryZones: input.deliveryZones ?? [],
      })
      .returning();
    bump();
    return { ok: true as const, product: row };
  } catch {
    return { ok: false as const, error: "Slug déjà utilisé ou catégorie invalide." };
  }
}

/**
 * Mise à jour d'un produit déjà créé (nom, description, prix, catégorie).
 *
 * Le `slug` est volontairement EXCLU (`Omit<…, "slug">`) : c'est l'URL
 * publique `/produits/[slug]` et la clé du tag de cache `product:<slug>`. Le
 * changer casserait les liens déjà partagés et laisserait une entrée de cache
 * orpheline. Renommer un produit ne touche donc pas son adresse.
 *
 * Les commandes passées ne bougent pas non plus : `order.itemsSnapshot` fige
 * `product_name` à l'achat (checkout.ts). L'historique garde le nom sous
 * lequel le client a commandé — c'est voulu.
 */
export async function updateProduct(
  id: string,
  input: Partial<Omit<ProductInput, "slug">>,
) {
  if (!(await getAdminUserId())) return DENIED;

  const nameErr = validateName(input.name);
  if (nameErr) return { ok: false as const, error: nameErr };

  const priceErr = validatePrice(input.basePrice);
  if (priceErr) return { ok: false as const, error: priceErr };

  // Construction explicite du SET : `input` est du JSON reçu sur une route
  // HTTP, pas un objet garanti par le compilateur — un `...input` écrirait
  // n'importe quelle clé présente dans le payload, y compris `slug` (URL
  // publique + clé de cache `product:<slug>`, volontairement immuable ici).
  const [row] = await dbAdmin
    .update(product)
    .set({
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.basePrice !== undefined ? { basePrice: input.basePrice } : {}),
      ...(input.hasTutorial !== undefined ? { hasTutorial: input.hasTutorial } : {}),
      ...(input.hasPdf !== undefined ? { hasPdf: input.hasPdf } : {}),
      ...(input.deliveryZones !== undefined ? { deliveryZones: input.deliveryZones } : {}),
      updatedAt: new Date(),
    })
    .where(eq(product.id, id))
    .returning();

  if (!row) return { ok: false as const, error: "Produit introuvable." };
  bump();
  return { ok: true as const, product: row };
}

export async function toggleProductActive(id: string, isActive: boolean) {
  if (!(await getAdminUserId())) return DENIED;

  await dbAdmin
    .update(product)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(product.id, id));
  bump();
  return { ok: true as const };
}
