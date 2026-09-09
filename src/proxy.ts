import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * proxy.ts (ex-middleware, renommé — convention Next 16).
 * Garde OPTIMISTE des routes /admin/* : redirige vers /connexion s'il n'y a
 * pas de cookie de session. Tourne sur le runtime edge, ne peut pas ouvrir de
 * connexion Postgres — la vérification du rôle `admin` réelle est faite dans
 * src/app/admin/layout.tsx (Server Component, runtime Node) ET dans chaque
 * Server Action (requireAdmin). Ne jamais s'appuyer uniquement sur ce fichier
 * pour l'autorisation.
 */
export default function proxy(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(req);
  if (!sessionCookie) {
    const loginUrl = new URL("/connexion", req.url);
    loginUrl.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
