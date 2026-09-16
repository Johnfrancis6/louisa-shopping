import "server-only";

/**
 * src/lib/auth-guards.ts
 * Helpers d'autorisation serveur partagés (Server Actions, Route Handlers,
 * layouts). SERVEUR UNIQUEMENT — importe next/headers + dbAdmin.
 *
 * Modèle d'autorisation (contrat v2.5 §C) : pas de pont RLS ↔ Better Auth.
 * L'appartenance et le rôle sont vérifiés ici, en TypeScript, via dbAdmin.
 */
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "./auth";
import { dbAdmin } from "./db/client";
import { authUser, customer } from "./db/schema";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** id de l'utilisateur connecté, ou null. */
export async function getUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.id ?? null;
}

/**
 * id de l'utilisateur SI il a le rôle `admin` (lu en base, pas depuis le
 * cookie), sinon null. Source de vérité unique pour toute garde admin.
 */
export async function getAdminUserId(): Promise<string | null> {
  const session = await getSession();
  if (!session?.user?.id) return null;

  const [row] = await dbAdmin
    .select({ role: authUser.role })
    .from(authUser)
    .where(eq(authUser.id, session.user.id))
    .limit(1);

  return row?.role === "admin" ? session.user.id : null;
}

/**
 * Filet de rattrapage — PAS un remplacement du hook `databaseHooks.user.create.after`
 * de `./auth.ts`, qui reste la voie normale de création du profil `customer`.
 * Ce hook s'exécute APRÈS le commit de `user` (Better Auth), donc HORS
 * transaction : s'il échoue, le compte existe et peut se connecter, mais n'a
 * pas de ligne `customer` — `createOrder`/`createReview` cassent alors sur la
 * FK `order.customer_id` / `review.customer_id` avec un message incompréhensible.
 *
 * Appelée en tête de ces deux Server Actions, juste après le contrôle de
 * session : si la ligne existe déjà (cas normal), aucune écriture. Sinon on
 * tente de la recréer depuis la session Better Auth.
 */
export async function ensureCustomer(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const session = await getSession();
  const user = session?.user;
  if (!user?.id) {
    return { ok: false, error: "Session expirée — veuillez vous reconnecter." };
  }

  const [existing] = await dbAdmin
    .select({ id: customer.id })
    .from(customer)
    .where(eq(customer.id, user.id))
    .limit(1);
  if (existing) return { ok: true };

  // `customer.phone` est notNull unique (contrat schema.ts) : sans téléphone
  // en session, on ne tente PAS l'insert plutôt que de violer la contrainte.
  const phone = String((user as { phone?: unknown }).phone ?? "").trim();
  if (!phone) {
    return {
      ok: false,
      error:
        "Profil client incomplet (numéro de téléphone manquant) — contactez l'administrateur.",
    };
  }

  try {
    // target: customer.id — n'absorbe QUE le conflit sur la PK (compte déjà
    // rattrapé entre le SELECT et l'INSERT). Le conflit sur l'index unique
    // customer_phone_unique (téléphone déjà pris par un AUTRE compte) n'est
    // pas couvert par ce target : il continue de lever, et on le rattrape
    // ci-dessous avec un message distinct.
    await dbAdmin
      .insert(customer)
      .values({
        id: user.id,
        name: user.name ?? "",
        phone,
        email: user.email ?? null,
      })
      .onConflictDoNothing({ target: customer.id });
    return { ok: true };
  } catch (err) {
    console.error("[auth-guards] ensureCustomer", err);
    // 23505 = unique_violation : ici, forcément customer_phone_unique (le
    // conflit sur la PK est absorbé par onConflictDoNothing). Toute autre
    // erreur est une panne, pas un conflit — ne pas accuser le téléphone du
    // client d'un incident de base de données.
    const code = (err as { code?: unknown })?.code;
    if (code === "23505") {
      return {
        ok: false,
        error:
          "Ce numéro de téléphone est déjà associé à un autre compte — contactez l'administrateur.",
      };
    }
    return {
      ok: false,
      error: "Impossible de vérifier votre profil client — réessayez dans un instant.",
    };
  }
}
