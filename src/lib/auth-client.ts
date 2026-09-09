/**
 * src/lib/auth-client.ts
 * Client Better Auth — utilisable dans les composants "use client"
 * (storefront ET admin). Ne jamais importer src/lib/auth.ts (serveur)
 * depuis un composant client — toujours passer par ce module.
 */

"use client";

import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  // baseURL : même origine par défaut. À définir si l'app et l'API divergent.
  plugins: [
    // Doit refléter user.additionalFields de src/lib/auth.ts (forme littérale
    // pour éviter d'importer le module serveur ici).
    inferAdditionalFields({
      user: {
        phone: { type: "string", required: true },
        role: { type: "string", required: false },
      },
    }),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
