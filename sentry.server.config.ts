// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://298f39837a6649d175a766cc2f8b75e4@o4512038411370496.ingest.de.sentry.io/4512038430244944",

  // Aligné sur sentry.client.config.ts (même raisonnement de quota du plan
  // free : 5 000 erreurs/mois) — pas de raison que le serveur consomme plus
  // vite le quota que le client.
  tracesSampleRate: 0.2,

  // Les Server Actions du checkout (createOrder, src/lib/actions/checkout.ts)
  // transportent nom, téléphone, adresse de livraison et indications d'accès
  // du client. httpBodies: [] empêche Sentry de capturer les corps de requête
  // (donc ces champs) et userInfo: false empêche la collecte auto de
  // l'identité utilisateur — rien de nominatif ne doit quitter l'infra vers
  // ce tiers (la page /confidentialite ne déclare aucun partage de ce type).
  dataCollection: {
    userInfo: false,
    httpBodies: [],
    // `stackFrameVariables` vaut true par défaut : Sentry capture alors la
    // valeur des variables locales de la pile. Dans createOrder, la locale
    // `address` porte nom, téléphone, quartier et indications d'accès — la
    // PII repartirait par ce chemin malgré httpBodies: []. Le gain de debug
    // ne vaut pas l'exposition des coordonnées d'un client.
    stackFrameVariables: false,
    // Les jetons sont filtrés d'office, mais pas un cookie applicatif comme
    // `cart-session` (un simple UUID, que le SDK n'a aucune raison de
    // reconnaître comme sensible).
    cookies: false,
  },
});
