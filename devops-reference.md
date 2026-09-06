# DevOps Reference — Louisa Shopping

Référence produite par l'agent DevOps. Périmètre : CI/CD, secrets, hébergement, monitoring (règles-coordination.md §4). Sources lues : `01-architecture/contrat-technique-v2.4.md` (contrat consolidé — le fichier a été retitré v2.3→v2.4 et mis à jour dans le drive le 05/09 23:32, remplaçant l'ancien v2.3+addendum lu en première passe), `03-stack/rapport-faisabilite.md`, `07-agent-db/db-reference.md`, `00-brief/regles-coordination.md`.

*Mise à jour : relecture du contrat v2.4 consolidé (post-écriture de la première version de ce document). Deux écarts precédemment signalés restent non résolus dans le contrat officiel ; deux autres sont clos.*

---

## 0. Écart détecté

| # | Sujet | Constat (v2.4) | Traitement retenu ici |
|---|---|---|---|
| 1 | **Hébergement — mentions Vercel toujours présentes en v2.4** | Le contrat v2.4 consolidé (relu) contient **encore** "Optimisation Vercel : privilégier ISR/PPR..." (§C) et "DevOps \| CI/CD, **secrets Vercel**, Lighthouse CI, ..." (§D). `rapport-faisabilite.md` §2/§6/§8 tranchait déjà pour **Netlify Free** ($0/mois). | **Tranché par l'utilisateur (05/09) : déploiement sur Netlify, pas Vercel.** Config de cette livraison confirmée conforme (netlify.toml, CI/CD, secrets Netlify). Il reste à faire porter cette décision dans `01-architecture/contrat-technique-v2.4.md` (§C "Optimisation Vercel" → Netlify, §D "secrets Vercel" → "secrets Netlify") — hors périmètre DevOps (agent Architecture, règle §4), à transmettre. |
| 2 | **Route/mécanisme `/api/webhooks/whatsapp`** | **Non résolu, renforcé en v2.4.** Le contrat consolidé conserve la route `/api/webhooks/whatsapp` (§A, "Messages Meta Business API"), le périmètre DevOps `src/app/api/webhooks/whatsapp` (§D), **et ajoute** en §E : "Redis Upstash — sessions panier **+ rate-limit webhooks WhatsApp**". Or `rapport-faisabilite.md` §4 est explicite : "il n'y a pas de messagerie automatisée [...] ce webhook n'existe plus" et "l'usage Redis se limite aux sessions panier". Le brief de cette tâche confirme également : aucune API WhatsApp. | **Aucun webhook implémenté, aucun secret Meta configuré, aucun rate-limit Redis dédié.** Le contrat officiel v2.4 et le rapport de faisabilité se contredisent frontalement sur ce point précis (pas juste un oubli de nettoyage) — à trancher explicitement par l'utilisateur avant que l'agent Logique métier ne code quoi que ce soit sous `src/lib/whatsapp/`. Je ne corrige pas le contrat (règle §8). |
| 3 | *(clos)* Addendum v2.4 — fichier séparé introuvable | Résolu : le document a été consolidé sous un titre unique `contrat-technique-v2.4`, même `fileId` que l'ancien v2.3 (retitré). Il n'y a plus d'"addendum" distinct à chercher. | Sans objet — contenu déjà intégré. |
| 4 | *(clos)* Préfixe `src/` | Résolu : v2.4 §A l'acte formellement pour tout le code applicatif (`src/lib/db/`, `src/lib/actions/`, `src/components/`, `src/app/`, `src/middleware.ts`). Plus d'écart de lecture sur ce point. | Config alignée sur `src/lib/db/schema.ts`, `src/lib/cloudinary/loader.ts`, etc. |
| 5 | **Emplacement `drizzle.config.ts` / `drizzle/` / `supabase/`** | Toujours non explicité par le contrat ni par `db-reference.md` (indentation perdue à l'export). | Convention drizzle-kit standard retenue : `drizzle.config.ts` et `drizzle/` à la **racine du repo**, `supabase/policies.sql` à la racine également. À confirmer par l'agent DB (règle du premier agent, §6). |
| 6 | **Sentry Team ($26/mois)** | `rapport-faisabilite.md` §2 et §9 anticipent un besoin payant si un 2ᵉ utilisateur doit consulter les alertes. | Non déclenché en V1 — un seul utilisateur configuré. Signalé pour traçabilité budgétaire, aucune action. |

---

## 1. Initialisation repo

Structure conforme à `07-agent-db/db-reference.md` §1 (DevOps ne touche pas à `src/lib/db/`, `src/lib/actions/`, etc. — règle du premier agent, §6). Fichiers livrés par cet agent :

```
├── next.config.ts
├── tailwind.config.ts
├── drizzle.config.ts
├── netlify.toml
├── instrumentation.ts
├── sentry.client.config.ts
├── sentry.server.config.ts
├── sentry.edge.config.ts
├── .env.example
├── lighthouserc.json
├── .github/workflows/ci-cd.yml
└── src/lib/cloudinary/loader.ts
```

| Fichier | Choix | Justification |
|---|---|---|
| `next.config.ts` | `experimental.useCache: true` (pas `dynamicIO`) | Active `'use cache'` (contrat §C) sans désactiver le pré-rendu global — pas de besoin de données temps réel sur les fiches produit. Vérifié : flag valide sur Next 15 (stack confirmée), remplacé par `cacheComponents` en v16 (hors périmètre, migration V2 planifiée par le contrat §E). |
| `next.config.ts` → `images` | Loader Cloudinary custom (`loader: 'custom'`) | Les images sont déjà transformées côté Cloudinary (`f_auto,q_auto`, contrainte brief) ; éviter une double optimisation via le pipeline Netlify Image CDN, qui a son propre quota de transformations distinct du quota bande passante déjà sous surveillance. |
| `tailwind.config.ts` | Squelette CSS variables (shadcn/ui) | Palette/tokens réels = propriété de l'agent Design (`02-design/`), pas dupliqués ici (règle §3). |
| `drizzle.config.ts` | `dialect: postgresql`, schéma `src/lib/db/schema.ts` | Voir Écart détecté #4. |
| `netlify.toml` | Build auto-détecté (pas de plugin Next.js déclaré à la main) | Netlify provisionne l'adaptateur OpenNext automatiquement et le maintient à jour — déclarer un plugin figé introduirait un risque de dérive de version. |

---

## 2. CI/CD

Pipeline GitHub Actions (`.github/workflows/ci-cd.yml`) — 3 jobs :

| Job | Déclencheur | Étapes | Bloquant |
|---|---|---|---|
| `quality` | PR + push `main` | `npm ci` → lint → typecheck → build | Oui — les jobs suivants en dépendent (`needs`) |
| `deploy-preview` | PR | Deploy Netlify **draft** → Lighthouse CI (mobile, seuil ≥ 85) sur l'URL de preview | Oui — le job échoue si `categories:performance < 0.85`, si LCP ≥ 2,5s ou CLS ≥ 0,1 (contrat §C) |
| `deploy-production` | push `main` | Deploy Netlify **production** → notification release Sentry | Non (déploiement déjà validé par la preview) |

Points spécifiques :

- **Un seul build par run** (`quality`), réutilisable en théorie — en V1 le déploiement Netlify relance son propre build via `nwtgck/actions-netlify@v3.0` (déploie le résultat de `next build`, pas de rebuild côté Netlify) pour éviter de consommer deux fois le quota de minutes/crédits.
- Build Netlify automatique sur push **désactivé côté dashboard Netlify** (Site settings > Build & deploy) — le déploiement passe uniquement par la CI, pour éviter un double build (GitHub Actions + Netlify) qui consommerait le quota Netlify deux fois pour rien.
- **Lighthouse CI** : `treosh/lighthouse-ci-action@v12`, `formFactor: mobile`, throttling simulé 4G/CPU×4 (config Lighthouse standard mobile). Seuils dans `lighthouserc.json` :
  - `performance ≥ 0.85` (erreur bloquante — seuil brief)
  - `LCP < 2500ms`, `CLS < 0.1` (erreur bloquante — contrat §C)
  - `INP < 200ms` **non assertable directement** en Lighthouse de laboratoire (métrique de terrain) — proxy `interactive`/TBT en `warn` seulement. À compléter en V2 par un suivi INP réel via Sentry Web Vitals si besoin.
- **Secrets de build** injectés via GitHub Actions Secrets (mêmes noms que `.env.example`), jamais commités.

---

## 3. Variables d'environnement (noms uniquement)

| Service | Variable | Portée |
|---|---|---|
| Supabase | `NEXT_PUBLIC_SUPABASE_URL` | Client + serveur |
| Supabase | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + serveur (`dbAnon`) |
| Supabase | `SUPABASE_SERVICE_ROLE_KEY` | Serveur uniquement (`dbAdmin`) — jamais exposée au client |
| Supabase | `DATABASE_URL` | Serveur uniquement (migrations Drizzle) |
| Better Auth | `BETTER_AUTH_SECRET` | Serveur uniquement |
| Better Auth | `BETTER_AUTH_URL` | Serveur uniquement |
| Upstash Redis | `UPSTASH_REDIS_REST_URL` | Serveur uniquement (sessions panier) |
| Upstash Redis | `UPSTASH_REDIS_REST_TOKEN` | Serveur uniquement |
| Cloudinary | `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Client + serveur |
| Cloudinary | `CLOUDINARY_API_KEY` | Serveur uniquement |
| Cloudinary | `CLOUDINARY_API_SECRET` | Serveur uniquement |
| Sentry | `NEXT_PUBLIC_SENTRY_DSN` | Client + serveur + edge |
| Sentry | `SENTRY_AUTH_TOKEN` | CI uniquement (upload source maps + release) |
| Sentry | `SENTRY_ORG` | CI uniquement |
| Sentry | `SENTRY_PROJECT` | CI uniquement |

WhatsApp : aucune variable — numéro/lien porté par l'entité `WhatsappConfig` (DB, singleton, éditable par l'Admin sans redeploy — confirmé contrat v2.4 §E), pas de secret d'API (voir Écart détecté #2, toujours ouvert côté contrat).

À déclarer à l'identique dans **Netlify** (Site settings → Environment variables) et **GitHub Actions Secrets** (dépôt → Settings → Secrets and variables → Actions).

---

## 4. Monitoring — Sentry

| Aspect | Configuration |
|---|---|
| Fichiers | `instrumentation.ts` (hook `register` + `onRequestError`), `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` |
| Couverture | Client (navigateur), serveur Node (Server Actions, Route Handlers, Server Components), edge (`middleware.ts` — admin-guard + traffic-context) |
| Plan | Free — 1 utilisateur, 5 000 erreurs/mois, 50 replays/mois (vérifié via `rapport-faisabilite.md` §3) |
| `tracesSampleRate` | 0.2 — marge large sous le quota vu le volume attendu (<100 SKU, trafic initial faible) |
| Replays | Désactivés en continu (`replaysSessionSampleRate: 0`), 10 % en cas d'erreur seulement — évite d'épuiser le quota de 50 replays/mois |
| `sendDefaultPii` | `false` — `Customer` porte `phone`/`email`/`address_json` (contrat §B), ne doit pas remonter automatiquement dans Sentry |
| Release tracking | `getsentry/action-release` sur déploiement production, pour lier les erreurs à un commit |

---

## 5. Vigilance budget (documentation, pas d'automatisation d'alerte en V1)

| Service | Quota free tier | Seuil de vigilance | Action si dépassement |
|---|---|---|---|
| **Netlify** | ~15 Go bande passante/mois (modèle à crédits, ~300 crédits) | Pas de dépassement toléré — le site s'arrête jusqu'au mois suivant | Suivre l'usage dans le dashboard Netlify (Site → Usage) ; si récurrent, Netlify Personal $9/mois |
| **Supabase** | Pause automatique après **7 jours d'inactivité** (projet gratuit) | Toute période creuse ≥ 7j | Prévoir un ping de keep-alive (cron externe gratuit type GitHub Actions scheduled, ou UptimeRobot) avant mise en prod publique, sinon Supabase Pro $25/mois |
| **Cloudinary** | 25 crédits/mois (pool unique transfos + stockage + bande passante) | Point de tension n°1 identifié par `rapport-faisabilite.md` — bande passante de livraison catalogue | `f_auto,q_auto` déjà actif dès le départ (brief) ; surveiller la conso dans le dashboard Cloudinary ; palier payant Plus $99/mois si besoin |
| **Upstash Redis** | 500 000 commandes/mois (sessions panier uniquement, pas de webhook à absorber) | 70-80 % du quota mensuel | Vérifier l'absence de boucles multipliant les appels (batcher/pipeliner) ; $0.20/100k commandes au-delà si besoin |
| **Sentry** | 5 000 erreurs/mois, 1 utilisateur, 50 replays/mois | Dès qu'une 2ᵉ personne doit consulter les alertes | Team $26/mois (service payant à signaler explicitement avant activation, cf. contrainte budget) |

**Budget plancher courant : $0/mois**, jusqu'à dépassement du quota Netlify (puis $9/mois) — conforme à la contrainte de ce brief. Aucun service payant introduit dans cette livraison.

---

## 6. Contraintes — traçabilité

| Contrainte brief | Statut |
|---|---|
| Budget plancher $0/mois | Respecté — voir §5 |
| Pas de fonction serverless redondante | Respecté — un seul point d'entrée serveur (adaptateur Netlify/OpenNext auto-provisionné), pas de fonction custom dupliquant la même logique ; `/api/og` reste sous la responsabilité de l'agent UI |
| Aucune intégration paiement | Respecté — rien configuré côté DevOps (pas de clé CinetPay/Orange/Moov) |
| Aucune API WhatsApp | Respecté côté cette livraison — mais **le contrat v2.4 officiel n'a pas été mis à jour en ce sens** (voir Écart détecté #2, non résolu, à trancher par l'utilisateur) |
| Structure de dossiers non réinventée | Respecté — voir §1 et Écart détecté #4 |
