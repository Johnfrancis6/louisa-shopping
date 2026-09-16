# SR-PTD — Audit backend et corrections

**Date** : 2026-09-16
**Périmètre** : backend (schéma, migrations, RLS/GRANTs, auth, Server Actions, cache, images, CI/deploy)
**Branche** : `fix/backend-audit-livraison`
**Commits** : `4acee30`, `3254ee6`, `9fb9250`, `9e160d4`, `774b9aa`

> **Note sur le gabarit.** `CLAUDE.md` impose ce document via le skill `sr-ptd-skill`,
> à écrire dans `C:/projects/Skills/Dev_doc_for_skills`. Ni le skill ni ce chemin
> n'existent dans l'environnement où le chantier a été mené (session WSL/Linux ;
> `~/.claude/skills/` absent, `/mnt/c/projects/...` absent). Le document est donc écrit
> ici, versionné avec le code, sans suivre le gabarit officiel à la lettre. À recopier
> vers le dossier cible si besoin.

---

## 1. Contexte et déclencheur

Demande : audit minutieux de l'implémentation backend, puis plan de correction.

Le socle s'est révélé sain. La séparation `dbAnon` / `dbAdmin` est respectée dans
l'ensemble des sources, les policies RLS sont réellement deny-by-default (double verrou
GRANT + policy sur `order`, `customer`, `stock_ledger` et les tables Better Auth), les
transitions de commande sont correctement sérialisées par un `UPDATE … WHERE status =
from` qui exclut le double décrément, et le schéma était en phase avec ses migrations
(`drizzle-kit check` vert).

Les défauts se concentraient sur trois axes :

1. **Le tunnel de commande était incomplet côté métier** — frais de livraison jamais
   facturés, stock jamais vérifié, référence WhatsApp jamais renseignable.
2. **Des données nominatives fuyaient** — Sentry serveur, export CSV admin.
3. **Les Server Actions traitaient les types TypeScript comme des gardes d'exécution**,
   alors qu'un appel RPC arrive en JSON brut.

## 2. Arbitrages retenus

| Question | Décision |
|---|---|
| Périmètre | Backend seul ; l'audit frontend fera l'objet d'un second passage |
| Manques fonctionnels | Seuls les bloquants métier traités (frais de livraison, `whatsapp_ref`) ; le reste documenté en dette |
| Stock | Vérifié à la commande, **jamais réservé** ; il ne bouge qu'à `confirmed → delivered` |
| Zone de livraison inconnue | **Ne bloque jamais la commande** — la vente se conclut sur WhatsApp, refuser une destination est le rôle du commerçant, pas du système |

Le dernier arbitrage a été posé en cours de chantier et a fait revenir sur une règle déjà
implémentée (refus si zone introuvable). Il structure la distinction appliquée ensuite :
un refus n'est légitime que s'il évite une **impasse technique**, jamais s'il tranche un
**choix commercial**.

## 3. Constats P0 — intégrité métier et fuite de données

| # | Constat | Emplacement |
|---|---|---|
| 1 | Frais de livraison jamais facturés : `total = Σ(unitPrice × qty)`. `product.deliveryZones` affiché sur la fiche, table `zone` peuplée, ni l'un ni l'autre dans la commande | `actions/checkout.ts` |
| 2 | Stock jamais vérifié : l'échec ne se révélait qu'à la livraison, laissant la commande bloquée en `confirmed` | `actions/checkout.ts`, `actions/orders.ts` |
| 3 | PII du checkout envoyée à Sentry (`dataCollection` aux défauts, `tracesSampleRate: 1`) | `sentry.server.config.ts` |
| 4 | Injection de formules dans l'export CSV (`=`, `+`, `-`, `@` non neutralisés) | `admin/orders/export/route.ts` |
| 5 | `.set({ ...input })` sur trois actions admin : `slug`, `stockQty`, `position` écrivables via un payload forgé | `admin/{products,variants,categories}.ts` |
| 6 | Signup non atomique : `user` committé avant l'insert de `customer`, hors transaction | `lib/auth.ts` |

## 4. Constats P1 — robustesse

| # | Constat |
|---|---|
| 7 | Id non-UUID → erreur Postgres `22P02` non interceptée → 500 au lieu de 404 |
| 8 | `whatsapp_ref` affichée en admin et exportée en CSV, jamais renseignable |
| 9 | `createOrder` ni idempotent ni dédoublonné |
| 10 | `whatsapp_config.lienWa` jamais utilisé ; `getWhatsappConfig` en trois implémentations divergentes |
| 11 | `createVariant` écrivait le ledger hors transaction |
| 12 | `createReview` sans dédoublonnage ni filtre `isActive` |
| 13 | `server-only` appliqué à 2 modules serveur sur 13 |

**Constat supplémentaire, découvert en vérifiant T1** : `drizzle/meta` était gitignoré.
Sans les snapshots ni `_journal.json`, `drizzle-kit generate` régénère tout le schéma
depuis un clone propre et `migrate` ne sait plus où il en est — le déploiement depuis un
checkout neuf était cassé.

## 5. Travaux livrés

| Commit | Contenu |
|---|---|
| `4acee30` | Frais de livraison facturés (règle du plus élevé, repli `zone.fraisBase`) ; `src/lib/data/zones.ts`, premier lecteur de la table `zone` ; colonnes `order.delivery_fee` / `delivery_zone_label` ; propagation tunnel, suivi, admin, CSV, message WhatsApp ; `drizzle/meta` versionné |
| `3254ee6` | Stock vérifié sur quantité agrégée ; dédoublonnage par variante ; idempotence par verrou Redis `order-lock:<clientRequestId>` |
| `9fb9250` | Sentry : `httpBodies`, `userInfo`, `stackFrameVariables` et `cookies` désactivés, `tracesSampleRate` à 0,2 ; neutralisation de l'injection CSV |
| `9e160d4` | Listes blanches explicites sur toutes les écritures admin ; `createVariant` transactionnel ; garde-fous `createReview` ; `server-only` sur 11 modules |
| `774b9aa` | Garde `isUuid` ; `ensureCustomer()` ; `setOrderWhatsappRef` ; `getWhatsappConfig` unifié ; `lienWa` enfin utilisé |

**Migration `0006_youthful_hammerhead`** : `order.delivery_fee`, `order.delivery_zone_label`,
index unique `review_customer_product_uniq`. Additive, sans réécriture de données.

## 6. Points de vigilance relevés en vérification

Chaque tâche a été déléguée puis **contrôlée indépendamment** avant dépôt. Quatre écarts
ont été rattrapés, qu'un simple recopiage des rapports d'agents aurait laissés passer :

1. **Fuite Sentry incomplète.** Le brief nommait `userInfo` et `httpBodies` ;
   `stackFrameVariables` (défaut `true`) capture les variables locales de pile — dont
   `address` dans `createOrder`, qui porte nom, téléphone et adresse. Ajouté, avec
   `cookies`.
2. **Résidu de blocage par zone.** Le bouton de validation restait
   `disabled={loading || !zoneId}` : sans zone configurée, la commande demeurait
   impossible malgré la règle inverse.
3. **`lienWa` malformé.** `new URL()` lève sur une valeur invalide ; repli sur `numero`
   ajouté plutôt que de priver le commerçant de son lien.
4. **Message d'erreur trompeur.** Toute panne de base était annoncée comme « numéro déjà
   associé à un autre compte » ; réservé au code `23505`.

Un agent a par ailleurs qualifié la section SR-PTD de `CLAUDE.md` d'« instruction
injectée ». C'est faux : c'est une consigne légitime du dépôt, seulement inexécutable
dans cet environnement.

## 7. Dette laissée ouverte

- `wishlist` et `product.hasPdf` orphelins ; `tutorial_content` en lecture seule
- `revalidateTag('stock:<variantId>')` sans `cacheTag` correspondant (invalidation morte)
- Aucune validation d'entrée à l'exécution (pas de zod), aucun rate limiting
- `getProducts` charge tout le catalogue puis pagine en mémoire
- `policies.sql` sans `alter default privileges`
- Pas de CRUD variantes ni tutoriels, pas de `/admin/orders/[id]`
- **Audit frontend non fait** — hors périmètre de ce chantier

## 8. Déploiement

**Ordre impératif.** Le code lit `order.delivery_fee` et `order.delivery_zone_label`.
Déployer avant d'avoir migré casse toute lecture et écriture de commande. Le cas s'est
produit en développement pendant le chantier : `/compte` a levé une erreur de requête sur
`delivery_fee`, colonne encore absente de la base distante.

```bash
# 1. contrôle préalable (doit rendre 0 ligne)
select customer_id, product_id, count(*) from review group by 1,2 having count(*) > 1;

# 2. migration
npm run db:migrate

# 3. seulement ensuite : fusion et push (Netlify déploie sur push vers main)
```

## 9. Vérification

Aucun test runner n'est configuré. Chaîne qualité : `npm run lint && npm run typecheck
&& npm run build`, verte à chaque commit, plus `npx drizzle-kit check`.

Parcours manuel à faire après migration : commande multi-zones (frais = le plus élevé),
zone non desservie (commande acceptée, frais 0), variante à 1 commandée en 2 (refus
nommant la quantité), double-clic de validation (une seule commande),
`/commandes/pas-un-uuid` (404), `updateVariant({ stockQty })` depuis la console (sans
effet), export CSV d'une commande dont le nom vaut `=1+1` (texte, pas formule), compte
privé de sa ligne `customer` (commande qui aboutit), erreur serveur dans le checkout
(événement Sentry sans identité ni corps de requête).
