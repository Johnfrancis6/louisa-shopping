/**
 * src/lib/auth.ts
 * Configuration serveur Better Auth — SERVEUR UNIQUEMENT.
 *
 * Décisions actées :
 *  1. Tables Better Auth standard (user/session/account/verification), PAS de
 *     fusion avec `customer` — un hook post-signup crée la ligne `customer`
 *     avec le MÊME id (contrat schema.ts).
 *  2. Email + mot de passe (pas de téléphone/OTP).
 *  3. `phone` collecté comme champ additionnel obligatoire au signup (stocké
 *     sur user.phone puis recopié sur customer.phone qui est notNull unique).
 *  4. Connexion DB : dbAdmin (service_role, bypass RLS).
 *  5. Session en base (révocation immédiate côté Admin).
 *  6. Rôles : user.role ∈ {'customer','admin'}. Promotion admin = manuelle
 *     (scripts/promote-admin.ts). Pas de plugin admin Better Auth en V1.
 */

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { dbAdmin } from "./db/client";
import {
  authUser,
  authSession,
  authAccount,
  authVerification,
  customer,
} from "./db/schema";
import { eq } from "drizzle-orm";

const PHONE_REGEX = /^\+?[0-9\s-]{8,20}$/;

export const auth = betterAuth({
  database: drizzleAdapter(dbAdmin, {
    provider: "pg",
    // Mapping explicite modèle Better Auth -> table Drizzle (objets, pas des
    // chaînes) — l'introspection auto échoue avec le Proxy dbAdmin.
    schema: {
      user: authUser,
      session: authSession,
      account: authAccount,
      verification: authVerification,
    },
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // pas de fournisseur email transactionnel confirmé
  },

  user: {
    additionalFields: {
      phone: {
        type: "string",
        required: true, // obligatoire pour satisfaire customer.phone (notNull unique)
        input: true,
      },
      role: {
        type: "string",
        required: false,
        input: false, // jamais défini par le client — promotion serveur uniquement
        defaultValue: "customer",
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 jours
    updateAge: 60 * 60 * 24, // rafraîchi si > 1 jour d'activité
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const phone = String(
            (user as unknown as { phone?: unknown }).phone ?? ""
          ).trim();
          if (!PHONE_REGEX.test(phone)) {
            throw new Error("Numéro de téléphone invalide.");
          }
          const [existing] = await dbAdmin
            .select({ id: customer.id })
            .from(customer)
            .where(eq(customer.phone, phone))
            .limit(1);
          if (existing) {
            throw new Error("Ce numéro de téléphone est déjà utilisé.");
          }
          return { data: { ...user, phone } };
        },
        after: async (user) => {
          const phone = String(
            (user as unknown as { phone?: unknown }).phone ?? ""
          ).trim();
          try {
            await dbAdmin.insert(customer).values({
              id: user.id,
              name: user.name,
              phone,
              email: user.email,
            });
          } catch (err) {
            // Le `before` a déjà validé l'unicité — un échec ici est anormal.
            console.error(
              `[auth] Échec création customer pour user ${user.id}`,
              err
            );
            throw err;
          }
        },
      },
    },
  },
});

export type Auth = typeof auth;
