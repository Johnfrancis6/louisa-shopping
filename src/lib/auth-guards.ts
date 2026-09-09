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
import { authUser } from "./db/schema";

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
