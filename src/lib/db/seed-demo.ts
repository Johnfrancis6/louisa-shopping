/**
 * src/lib/db/seed-demo.ts
 * Jeu de données de DÉMO — script opérateur, exécuté en CLI (`npm run db:seed:demo`).
 *
 * But : peupler une base déjà migrée + `db:seed` (catégories/zones/config WA)
 * avec de quoi tester TOUS les parcours sans cliquer 20 fois dans le tunnel :
 *  - catalogue paginé + facettes (couleur / taille / prix / en stock)
 *  - fiche produit (images multiples, variantes, rupture de stock, tutoriel)
 *  - recherche (nom + SKU)
 *  - avis produit (approuvés visibles, en attente / rejetés pour la modération)
 *  - back-office commandes : une commande dans chaque statut du diagramme §F
 *  - stock_ledger + variant.stock_qty cohérents avec les commandes décrémentées
 *  - wishlist, adresses client pré-remplies
 *
 * Connexion : `DATABASE_URL_MIGRATE` (rôle `postgres`) comme `seed.ts` — un
 * seed est un outil d'amorçage hors-bande, pas une surface applicative.
 * Les comptes clients passent par l'API serveur Better Auth (`auth.api`) pour
 * obtenir un vrai hash de mot de passe + déclencher le hook `customer`.
 *
 * IDÉMPOTENT : tout est préfixé (`demo-*` pour les slugs produits,
 * `@louisa-demo.test` pour les e-mails) et purgé en tête de script, donc
 * ré-exécutable sans erreur de contrainte unique.
 *
 * Comptes créés (mot de passe commun : `LouisaDemo1!`) :
 *   aicha.demo@louisa-demo.test    — Aïcha Ouédraogo (adresse Ouagadougou)
 *   moussa.demo@louisa-demo.test   — Moussa Traoré   (adresse Bobo-Dioulasso)
 *   fatou.demo@louisa-demo.test    — Fatou Kaboré    (aucune adresse — nouveau client)
 */

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, sql } from "drizzle-orm";
import * as schema from "./schema";

// tsx ne charge PAS .env/.env.local automatiquement — chargement explicite.
config({ path: ".env" });
config({ path: ".env.local", override: true });

const url = process.env.DATABASE_URL_MIGRATE ?? process.env.DATABASE_URL_ADMIN;
if (!url) {
  console.error("[seed-demo] DATABASE_URL_MIGRATE (ou DATABASE_URL_ADMIN) manquante.");
  process.exit(1);
}

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "r9iswf0z";
const DEMO_EMAIL_DOMAIN = "@louisa-demo.test";
const DEMO_PASSWORD = "LouisaDemo1!";

const client = postgres(url, { prepare: false, max: 1 });
const db = drizzle(client, { schema });

const {
  category,
  zone,
  product,
  variant,
  media,
  tutorialContent,
  customer,
  order,
  orderItem,
  stockLedger,
  review,
  wishlist,
} = schema;

// ───────────────────────────────────────────────────────────────────────────
// Référentiel produits — data-driven (variantes / médias générés en boucle).
// `images` = public_id Cloudinary (échantillons livrés avec tout compte
// Cloudinary — URL de delivery standard, le loader injecte f_auto,q_auto).
// ───────────────────────────────────────────────────────────────────────────

type VariantSpec = {
  size?: string;
  color?: string;
  stock: number;
  priceOverride?: number;
};

type ProductSpec = {
  slug: string;
  name: string;
  categorySlug: string;
  description: string;
  basePrice: number;
  hasTutorial?: boolean;
  images: string[];
  variants: VariantSpec[];
};

const PRODUCTS: ProductSpec[] = [
  {
    slug: "demo-mixeur-plongeant",
    name: "Mixeur plongeant 800 W",
    categorySlug: "electromenager",
    description:
      "Mixeur plongeant en inox, 2 vitesses, bol gradué 600 ml et fouet inclus. Idéal pour soupes, sauces et compotes.",
    basePrice: 18500,
    images: ["cld-sample-3", "samples/ecommerce/car-interior-design"],
    variants: [
      { color: "Blanc", stock: 24 },
      { color: "Noir", stock: 6 },
    ],
  },
  {
    slug: "demo-blender-chauffant",
    name: "Blender chauffant 1,5 L",
    categorySlug: "electromenager",
    description:
      "Blender chauffant multifonction : soupe veloutée en 25 min, programmes smoothie et glace pilée. Cuve verre borosilicate.",
    basePrice: 45000,
    hasTutorial: true,
    images: ["cld-sample-4", "cld-sample-5", "cld-sample"],
    variants: [{ color: "Gris ardoise", stock: 11 }],
  },
  {
    slug: "demo-sac-cuir-gris",
    name: "Sac à main cuir grainé",
    categorySlug: "sacs-a-main",
    description:
      "Sac porté épaule en cuir grainé véritable, doublure textile, poche zippée intérieure. Bandoulière amovible.",
    basePrice: 27000,
    images: ["samples/ecommerce/leather-bag-gray", "samples/ecommerce/accessories-bag"],
    variants: [
      { color: "Gris", stock: 15 },
      { color: "Camel", stock: 4 },
    ],
  },
  {
    slug: "demo-sac-bandouliere",
    name: "Sac bandoulière compact",
    categorySlug: "sacs-a-main",
    description:
      "Petit sac bandoulière du quotidien, format téléphone + portefeuille, fermeture aimantée.",
    basePrice: 19500,
    images: ["samples/ecommerce/accessories-bag", "samples/ecommerce/leather-bag-gray"],
    variants: [
      { color: "Noir", stock: 20 },
      { color: "Bordeaux", stock: 9 },
      { color: "Écru", stock: 0 },
    ],
  },
  {
    slug: "demo-velo-appartement",
    name: "Vélo d'appartement pliable",
    categorySlug: "fitness-velos-de-sport",
    description:
      "Vélo d'appartement pliable, 8 niveaux de résistance magnétique, écran LCD (distance, calories, pouls), selle réglable.",
    basePrice: 165000,
    hasTutorial: true,
    images: ["samples/bike", "cld-sample-2"],
    variants: [{ stock: 3 }],
  },
  {
    slug: "demo-tapis-yoga",
    name: "Tapis de yoga antidérapant 6 mm",
    categorySlug: "fitness-velos-de-sport",
    description:
      "Tapis de yoga TPE double densité, 183 × 61 cm, antidérapant sur les deux faces, sangle de transport fournie.",
    basePrice: 8000,
    images: ["cld-sample-2", "samples/balloons"],
    variants: [
      { color: "Violet", stock: 30 },
      { color: "Vert d'eau", stock: 18 },
      { color: "Gris", stock: 0 },
    ],
  },
  {
    slug: "demo-chemise-lin-homme",
    name: "Chemise en lin homme",
    categorySlug: "vetements-homme",
    description:
      "Chemise 100 % lin lavé, col français, coupe droite. Respirante, se porte ouverte sur un t-shirt ou fermée.",
    basePrice: 15000,
    images: ["samples/man-portrait", "cld-sample"],
    variants: [
      { size: "S", color: "Blanc", stock: 12 },
      { size: "M", color: "Blanc", stock: 10 },
      { size: "L", color: "Bleu ciel", stock: 7 },
      { size: "XL", color: "Bleu ciel", stock: 0 },
    ],
  },
  {
    slug: "demo-polo-classique",
    name: "Polo piqué classique",
    categorySlug: "vetements-homme",
    description:
      "Polo en maille piquée de coton, col côtelé, 2 boutons nacrés. Un basique qui se repasse facilement.",
    basePrice: 12000,
    images: ["cld-sample", "samples/smile"],
    variants: [
      { size: "M", color: "Marine", stock: 22 },
      { size: "L", color: "Marine", stock: 14 },
      { size: "L", color: "Vert bouteille", stock: 5 },
    ],
  },
  {
    slug: "demo-robe-wax",
    name: "Robe en wax cintrée",
    categorySlug: "vetements-femme",
    description:
      "Robe mi-longue en wax, taille cintrée, manches courtes, fermeture éclair dos. Tissu 100 % coton.",
    basePrice: 22000,
    images: ["samples/two-ladies", "samples/smile"],
    variants: [
      { size: "S", stock: 8 },
      { size: "M", stock: 11 },
      { size: "L", stock: 6 },
    ],
  },
  {
    slug: "demo-ensemble-pagne",
    name: "Ensemble pagne 2 pièces",
    categorySlug: "vetements-femme",
    description:
      "Ensemble haut + jupe longue en pagne, doublé, finitions main. Motifs susceptibles de légères variations.",
    basePrice: 30000,
    images: ["samples/two-ladies"],
    variants: [
      { size: "M", stock: 5 },
      { size: "L", stock: 4 },
    ],
  },
  {
    slug: "demo-etagere-bois-4-niveaux",
    name: "Étagère bois 4 niveaux",
    categorySlug: "etageres",
    description:
      "Étagère de rangement 4 niveaux, structure métal époxy et plateaux effet chêne clair. 60 × 30 × 120 cm.",
    basePrice: 38000,
    images: ["samples/chair-and-coffee-table"],
    variants: [{ stock: 7 }],
  },
  {
    slug: "demo-sac-isotherme-24l",
    name: "Sac isotherme 24 L",
    categorySlug: "sacs-isothermes",
    description:
      "Sac isotherme 24 L, doublure thermosoudée, maintien au frais jusqu'à 12 h. Bandoulière + poignées.",
    basePrice: 9500,
    images: ["samples/ecommerce/accessories-bag"],
    variants: [
      { color: "Gris", stock: 26, priceOverride: 7900 },
      { color: "Bleu", stock: 13 },
    ],
  },
  {
    slug: "demo-tenue-fillette-ceremonie",
    name: "Tenue fillette de cérémonie",
    categorySlug: "tenues-fillettes",
    description:
      "Robe de cérémonie pour fillette, tulle doublé coton, ceinture satin à nouer, boléro assorti.",
    basePrice: 14000,
    images: ["samples/smile"],
    variants: [
      { size: "2 ans", stock: 9 },
      { size: "4 ans", stock: 12 },
      { size: "6 ans", stock: 3 },
    ],
  },
  {
    slug: "demo-plat-ceramique-ovale",
    name: "Plat ovale en céramique",
    categorySlug: "plats",
    description:
      "Grand plat de service ovale 36 cm en céramique émaillée, passe au four et au lave-vaisselle.",
    basePrice: 6500,
    images: ["samples/food/fish-vegetables", "samples/dessert-on-a-plate", "samples/food/spices"],
    variants: [
      { color: "Blanc cassé", stock: 40 },
      { color: "Terracotta", stock: 22 },
    ],
  },
  {
    slug: "demo-climatiseur-mobile",
    name: "Climatiseur mobile 9000 BTU",
    categorySlug: "climatiseurs",
    description:
      "Climatiseur mobile 9000 BTU, 3-en-1 (froid / ventilateur / déshumidificateur), kit fenêtre inclus, minuterie 24 h.",
    basePrice: 285000,
    hasTutorial: true,
    images: ["samples/ecommerce/car-interior-design", "cld-sample-5"],
    variants: [{ stock: 2 }],
  },
];

// ───────────────────────────────────────────────────────────────────────────
// Clients de démo
// ───────────────────────────────────────────────────────────────────────────

type CustomerSpec = {
  key: string;
  name: string;
  email: string;
  phone: string;
  address?: { fullName: string; phone: string; city: string; directions?: string };
};

const CUSTOMERS: CustomerSpec[] = [
  {
    key: "aicha",
    name: "Aïcha Ouédraogo",
    email: `aicha.demo${DEMO_EMAIL_DOMAIN}`,
    phone: "+22670000101",
    address: {
      fullName: "Aïcha Ouédraogo",
      phone: "+22670000101",
      city: "Ouagadougou — Ouaga 2000",
      directions: "Villa 12, rue 29.14, en face de la pharmacie du Progrès",
    },
  },
  {
    key: "moussa",
    name: "Moussa Traoré",
    email: `moussa.demo${DEMO_EMAIL_DOMAIN}`,
    phone: "+22676000202",
    address: {
      fullName: "Moussa Traoré",
      phone: "+22676000202",
      city: "Bobo-Dioulasso — Accart-Ville",
      directions: "Près du marché de Accart-Ville, portail vert",
    },
  },
  {
    key: "fatou",
    name: "Fatou Kaboré",
    email: `fatou.demo${DEMO_EMAIL_DOMAIN}`,
    phone: "+22678000303",
  },
];

// ───────────────────────────────────────────────────────────────────────────
// Commandes de démo — une par statut du diagramme §F.
// `variant` = `<slug produit>#<index variante>` ; `decremented` = le stock a
// réellement été retiré (transition confirmed→processing franchie).
// ───────────────────────────────────────────────────────────────────────────

type OrderSpec = {
  key: string;
  customer: string;
  status: schema.OrderStatus;
  payment: "mobile_money_orange" | "mobile_money_moov" | "cod";
  whatsappRef?: string;
  daysAgo: number;
  decremented?: boolean;
  lines: { variant: string; qty: number }[];
};

const ORDERS: OrderSpec[] = [
  {
    key: "o1",
    customer: "aicha",
    status: "pending_whatsapp",
    payment: "cod",
    daysAgo: 0,
    lines: [{ variant: "demo-mixeur-plongeant#0", qty: 1 }],
  },
  {
    key: "o2",
    customer: "aicha",
    status: "confirmed",
    payment: "mobile_money_orange",
    whatsappRef: "WA-2026-0142",
    daysAgo: 2,
    lines: [
      { variant: "demo-sac-bandouliere#0", qty: 1 },
      { variant: "demo-plat-ceramique-ovale#0", qty: 2 },
    ],
  },
  {
    key: "o3",
    customer: "moussa",
    status: "processing",
    payment: "mobile_money_moov",
    whatsappRef: "WA-2026-0138",
    daysAgo: 4,
    decremented: true,
    lines: [{ variant: "demo-chemise-lin-homme#1", qty: 2 }],
  },
  {
    key: "o4",
    customer: "moussa",
    status: "delivered",
    payment: "cod",
    whatsappRef: "WA-2026-0119",
    daysAgo: 12,
    decremented: true,
    lines: [{ variant: "demo-plat-ceramique-ovale#0", qty: 3 }],
  },
  {
    key: "o5",
    customer: "fatou",
    status: "shipped",
    payment: "mobile_money_orange",
    whatsappRef: "WA-2026-0135",
    daysAgo: 5,
    decremented: true,
    lines: [{ variant: "demo-sac-cuir-gris#0", qty: 1 }],
  },
  {
    key: "o6",
    customer: "fatou",
    status: "cancelled",
    payment: "cod",
    whatsappRef: "WA-2026-0128",
    daysAgo: 7,
    lines: [{ variant: "demo-robe-wax#1", qty: 1 }],
  },
];

// ───────────────────────────────────────────────────────────────────────────
// Avis — approuvés (visibles storefront), en attente + rejetés (modération).
// ───────────────────────────────────────────────────────────────────────────

const REVIEWS: {
  product: string;
  customer: string;
  rating: number;
  status: "approved" | "pending" | "rejected";
  body: string;
}[] = [
  {
    product: "demo-sac-cuir-gris",
    customer: "aicha",
    rating: 5,
    status: "approved",
    body: "Superbe qualité, le cuir est épais et les finitions sont nettes. Je recommande.",
  },
  {
    product: "demo-sac-cuir-gris",
    customer: "moussa",
    rating: 4,
    status: "approved",
    body: "Conforme à la photo, livraison rapide sur Bobo. Un point en moins pour l'odeur au déballage.",
  },
  {
    product: "demo-robe-wax",
    customer: "fatou",
    rating: 5,
    status: "approved",
    body: "Les couleurs sont éclatantes et la taille est parfaite. Tissu épais, bien cousu.",
  },
  {
    product: "demo-velo-appartement",
    customer: "moussa",
    rating: 3,
    status: "pending",
    body: "Correct pour le prix mais le montage est long et la notice peu claire.",
  },
  {
    product: "demo-plat-ceramique-ovale",
    customer: "aicha",
    rating: 4,
    status: "pending",
    body: "Joli plat, un peu plus petit que ce que j'imaginais mais parfait pour le four.",
  },
  {
    product: "demo-mixeur-plongeant",
    customer: "fatou",
    rating: 2,
    status: "rejected",
    body: "Assez bruyant à pleine vitesse.",
  },
];

const WISHLIST: { customer: string; product: string; variant?: string }[] = [
  { customer: "aicha", product: "demo-climatiseur-mobile" },
  { customer: "aicha", product: "demo-velo-appartement" },
  { customer: "moussa", product: "demo-sac-bandouliere", variant: "demo-sac-bandouliere#0" },
  { customer: "fatou", product: "demo-robe-wax", variant: "demo-robe-wax#1" },
];

// ───────────────────────────────────────────────────────────────────────────

function imgUrl(publicId: string) {
  return `https://res.cloudinary.com/${CLOUD}/image/upload/${publicId}.jpg`;
}

async function purge() {
  // Ordre dicté par les FK : stock_ledger (restrict sur variant) → commandes
  // → avis / wishlist → users (cascade customer/session/account) → produits
  // (cascade variant/media/tutorial_content).
  await db.execute(sql`
    delete from ${stockLedger}
    where ${stockLedger.variantId} in (
      select v.id from ${variant} v
      join ${product} p on p.id = v.product_id
      where p.slug like 'demo-%'
    )
  `);
  await db.execute(sql`
    delete from ${order}
    where ${order.customerId} in (
      select id from "user" where email like ${"%" + DEMO_EMAIL_DOMAIN}
    )
  `);
  await db.execute(sql`
    delete from ${review}
    where ${review.productId} in (select id from ${product} where slug like 'demo-%')
  `);
  await db.execute(sql`
    delete from ${wishlist}
    where ${wishlist.productId} in (select id from ${product} where slug like 'demo-%')
  `);
  await db.execute(
    sql`delete from "user" where email like ${"%" + DEMO_EMAIL_DOMAIN}`
  );
  await db.execute(sql`delete from ${product} where slug like 'demo-%'`);
}

async function main() {
  await purge();

  // — Référentiels requis (posés par `npm run db:seed`) ————————————————————
  const cats = await db
    .select({ id: category.id, slug: category.slug })
    .from(category);
  const catBySlug = new Map(cats.map((c) => [c.slug, c.id]));
  const missing = [...new Set(PRODUCTS.map((p) => p.categorySlug))].filter(
    (s) => !catBySlug.has(s)
  );
  if (missing.length) {
    throw new Error(
      `Catégories absentes : ${missing.join(", ")}. Lancez d'abord "npm run db:seed".`
    );
  }

  const [ouaga] = await db
    .select({ id: zone.id })
    .from(zone)
    .where(eq(zone.nom, "Ouagadougou"))
    .limit(1);

  const deliveryZones = [
    {
      zone_id: ouaga?.id ?? null,
      zone_label: "Ouagadougou",
      frais: 1500,
      delai_jours_min: 1,
      delai_jours_max: 2,
    },
    {
      zone_id: null,
      zone_label: "Bobo-Dioulasso",
      frais: 3000,
      delai_jours_min: 2,
      delai_jours_max: 4,
    },
  ];

  // — Produits ————————————————————————————————————————————————————————————
  const productRows = await db
    .insert(product)
    .values(
      PRODUCTS.map((p, i) => ({
        slug: p.slug,
        categoryId: catBySlug.get(p.categorySlug)!,
        name: p.name,
        description: p.description,
        basePrice: p.basePrice,
        hasTutorial: p.hasTutorial ?? false,
        isActive: true,
        deliveryZones,
        // Étalé dans le temps → tri catalogue (desc created_at) déterministe.
        createdAt: new Date(Date.now() - (PRODUCTS.length - i) * 3_600_000),
      }))
    )
    .returning({ id: product.id, slug: product.slug });
  const productIdBySlug = new Map(productRows.map((r) => [r.slug, r.id]));

  // — Variantes ———————————————————————————————————————————————————————————
  type VRow = { id: string; sku: string; size: string | null; color: string | null; unitPrice: number };
  const variantByKey = new Map<string, VRow>();
  const variantValues: (typeof variant.$inferInsert)[] = [];
  const variantKeys: string[] = [];
  PRODUCTS.forEach((p, pi) => {
    p.variants.forEach((v, vi) => {
      const sku = `DEMO-${String(pi + 1).padStart(2, "0")}-${String.fromCharCode(65 + vi)}`;
      variantValues.push({
        productId: productIdBySlug.get(p.slug)!,
        size: v.size ?? null,
        color: v.color ?? null,
        sku,
        stockQty: v.stock,
        priceOverride: v.priceOverride ?? null,
      });
      variantKeys.push(`${p.slug}#${vi}`);
    });
  });
  const variantRows = await db
    .insert(variant)
    .values(variantValues)
    .returning({
      id: variant.id,
      sku: variant.sku,
      size: variant.size,
      color: variant.color,
      priceOverride: variant.priceOverride,
      productId: variant.productId,
    });
  const basePriceByProductId = new Map(
    productRows.map((r) => [r.id, PRODUCTS.find((p) => p.slug === r.slug)!.basePrice])
  );
  variantRows.forEach((r, idx) => {
    variantByKey.set(variantKeys[idx], {
      id: r.id,
      sku: r.sku,
      size: r.size,
      color: r.color,
      unitPrice: r.priceOverride ?? basePriceByProductId.get(r.productId)!,
    });
  });

  // — Médias ——————————————————————————————————————————————————————————————
  await db.insert(media).values(
    PRODUCTS.flatMap((p) =>
      p.images.map((publicId, position) => ({
        productId: productIdBySlug.get(p.slug)!,
        url: imgUrl(publicId),
        publicId,
        type: "image" as const,
        position,
        alt: `${p.name} — vue ${position + 1}`,
      }))
    )
  );

  // — Contenu tutoriel ————————————————————————————————————————————————————
  const tutoValues = PRODUCTS.filter((p) => p.hasTutorial).map((p) => ({
    productId: productIdBySlug.get(p.slug)!,
    type: "video" as const,
    url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
    label: `Prise en main — ${p.name}`,
  }));
  if (tutoValues.length) await db.insert(tutorialContent).values(tutoValues);

  // — Clients (via Better Auth pour un vrai hash + hook customer) ——————————
  const { auth } = await import("../auth");
  const customerIdByKey = new Map<string, string>();
  const customerNameByKey = new Map<string, string>();
  for (const c of CUSTOMERS) {
    const res = await auth.api.signUpEmail({
      body: { email: c.email, password: DEMO_PASSWORD, name: c.name, phone: c.phone },
    });
    customerIdByKey.set(c.key, res.user.id);
    customerNameByKey.set(c.key, c.name);
    if (c.address) {
      await db
        .update(customer)
        .set({ addressJson: c.address })
        .where(eq(customer.id, res.user.id));
    }
  }

  // — Commandes + lignes + ledger ————————————————————————————————————————
  for (const o of ORDERS) {
    const custId = customerIdByKey.get(o.customer)!;
    const cust = CUSTOMERS.find((c) => c.key === o.customer)!;
    const lines = o.lines.map((l) => {
      const v = variantByKey.get(l.variant);
      if (!v) throw new Error(`Variante inconnue dans ${o.key} : ${l.variant}`);
      const spec = PRODUCTS.find((p) => l.variant.startsWith(`${p.slug}#`))!;
      return { v, qty: l.qty, hasTutorial: spec.hasTutorial ?? false, productName: spec.name };
    });
    const total = lines.reduce((s, l) => s + l.v.unitPrice * l.qty, 0);
    const address = o.status === "pending_whatsapp" && !cust.address
      ? { fullName: cust.name, phone: cust.phone, city: "Ouagadougou — Tanghin" }
      : cust.address ?? { fullName: cust.name, phone: cust.phone, city: "Ouagadougou — Tanghin" };
    const createdAt = new Date(Date.now() - o.daysAgo * 86_400_000);

    const [orderRow] = await db
      .insert(order)
      .values({
        customerId: custId,
        status: o.status,
        paymentMethod: o.payment,
        total,
        itemsSnapshot: lines.map((l) => ({
          variant_id: l.v.id,
          sku: l.v.sku,
          product_name: l.productName,
          size: l.v.size,
          color: l.v.color,
          unit_price_at_order: l.v.unitPrice,
          qty: l.qty,
          has_tutorial: l.hasTutorial,
        })),
        deliveryAddress: address,
        whatsappRef: o.whatsappRef ?? null,
        createdAt,
        updatedAt: createdAt,
      })
      .returning({ id: order.id });

    await db.insert(orderItem).values(
      lines.map((l) => ({
        orderId: orderRow.id,
        variantId: l.v.id,
        qty: l.qty,
        unitPrice: l.v.unitPrice,
      }))
    );

    // stock_ledger + décrément réel uniquement si la commande a franchi
    // confirmed→processing (règle §C : seul moment où le stock bouge).
    if (o.decremented) {
      for (const l of lines) {
        await db.insert(stockLedger).values({
          variantId: l.v.id,
          delta: -l.qty,
          reason: "order",
          orderId: orderRow.id,
          createdAt,
        });
        await db
          .update(variant)
          .set({ stockQty: sql`${variant.stockQty} - ${l.qty}` })
          .where(eq(variant.id, l.v.id));
      }
    }
  }

  // — Avis ————————————————————————————————————————————————————————————————
  await db.insert(review).values(
    REVIEWS.map((r) => ({
      productId: productIdBySlug.get(r.product)!,
      customerId: customerIdByKey.get(r.customer)!,
      authorName: customerNameByKey.get(r.customer)!,
      rating: r.rating,
      body: r.body,
      status: r.status,
    }))
  );

  // — Wishlist ————————————————————————————————————————————————————————————
  await db.insert(wishlist).values(
    WISHLIST.map((w) => ({
      customerId: customerIdByKey.get(w.customer)!,
      productId: productIdBySlug.get(w.product)!,
      variantId: w.variant ? variantByKey.get(w.variant)!.id : null,
    }))
  );

  const variantCount = variantValues.length;
  const mediaCount = PRODUCTS.reduce((s, p) => s + p.images.length, 0);
  console.log(
    [
      "Seed démo terminé :",
      `  ${PRODUCTS.length} produits, ${variantCount} variantes, ${mediaCount} images, ${tutoValues.length} tutoriels`,
      `  ${CUSTOMERS.length} clients (mdp : ${DEMO_PASSWORD})`,
      `  ${ORDERS.length} commandes (${ORDERS.map((o) => o.status).join(", ")})`,
      `  ${REVIEWS.length} avis (${REVIEWS.filter((r) => r.status === "approved").length} approuvés), ${WISHLIST.length} favoris`,
    ].join("\n")
  );
}

main()
  .catch((err) => {
    console.error("Échec du seed démo :", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
