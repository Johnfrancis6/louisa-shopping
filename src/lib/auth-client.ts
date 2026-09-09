/**
 * src/lib/auth-client.ts
 * Client Better Auth — utilisable dans les composants "use client"
 * (storefront ET admin). Ne jamais importer src/lib/auth.ts (serveur)
 * depuis un composant client — toujours passer par ce module.
 */

"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // baseURL optionnel si même origine ; à définir explicitement si
  // l'app est servie depuis un domaine différent de l'API.
});

export const { signIn, signUp, signOut, useSession } = authClient;