# SR-PTD — Audit frontend, bloc 1 : layout & navigation

**Date** : 2026-09-16
**Périmètre** : chrome storefront — `navbar`, `nav-links`, `nav-drawer`,
`mobile-bottom-nav`, `footer`, `logo`, `cart-badge`, `admin-nav-link`,
`src/app/layout.tsx`, `(storefront)/layout.tsx`, `(storefront)/template.tsx`
**Branche** : `fix/backend-audit-livraison`
**Commit** : `048ddc8`

> **Note sur le gabarit.** `CLAUDE.md` impose ce document via le skill
> `sr-ptd-skill`, à écrire dans `C:/projects/Skills/Dev_doc_for_skills`. Ni le skill
> ni ce chemin n'existent dans cet environnement (WSL/Linux : `~/.claude/skills/`
> absent, `/mnt/c/projects/` absent). Comme pour l'audit backend, le document est
> écrit ici, versionné avec le code. À recopier vers le dossier cible si besoin.

---

## 1. Contexte et déclencheur

Premier bloc de l'audit frontend décrit par
[`HANDOFF-frontend-audit.md`](./HANDOFF-frontend-audit.md). Méthode reprise du
chantier backend : un bloc à la fois, vérifié et committé avant le suivant.

`docs/design/` a été lu intégralement **avant** le code et traité comme normatif :
les écarts sont mesurés contre la doc, pas re-dérivés depuis l'implémentation.

Le socle est sain. Les tokens (`design-system.css`) et le mapping shadcn
(`globals.css`) sont cohérents et sans doublon ; aucune fuite de palette brute
(`neutral-*`, `indigo-*`, `red-*`…) ni de rayon hors échelle dans les fichiers du
bloc ; `grep "border-radius:--radius"` sur le CSS compilé = 0 (le piège Tailwind v4
est bien évité) ; les frontières `<Suspense>` autour de `usePathname()` /
`cookies()` sont en place partout, comme l'exige `cacheComponents`.

Les défauts se concentrent sur deux axes : **ce que le shell prérendu contient
réellement**, et **ce qu'un lecteur d'écran ou un doigt atteint**.

## 2. Arbitrages retenus

| Question | Décision |
|---|---|
| Périmètre du bloc | Chrome uniquement. `SearchTrigger` inclus bien qu'il vive dans `search-modal.tsx` (bloc 7) : c'est la barre de la navbar, et son défaut est un plancher tactile non négociable. |
| `src/components/ui/sheet.tsx` | Modifié malgré son statut de primitive shadcn vendorisée : c'est la sortie du drawer mobile. La correction profite aussi au bottom sheet des filtres (bloc 3). |
| Numéro de téléphone du footer | Lu sur `whatsapp_config` plutôt que corrigé en dur — une source unique, celle du hand-off `wa.me`. |
| `product-card.tsx` | **Non touché, non committé** — WIP utilisateur, conformément au relais. |
| Branche | Commit sur `fix/backend-audit-livraison`, qui n'est pas encore fusionnée. Le nom de branche ne couvre plus le périmètre ; à arbitrer avant la PR. |

## 3. Constats — ce qui casse pour l'utilisateur

**`blocker`/`major` — la navigation principale mobile était inerte avant hydratation.**
`NavItemsFallback` rendait des `<div>`. Sous `cacheComponents`, `usePathname()`
suspend pendant le prérendu : c'est donc le *fallback* qui part dans le HTML
statique. La barre du bas — navigation principale d'un storefront mobile-first, sur
un marché où la bande passante n'est pas acquise — n'était cliquable qu'une fois le
JS chargé, et ne contenait aucun lien pour un crawler. Diagnostic confirmé dans
`.next/server/app/index.html` (marqueur `<!--$?-->` de frontière suspendue).
Le fallback de la navbar (`NavbarLinksFallback`), lui, rendait bien des `<Link>` :
l'incohérence entre les deux fallbacks est ce qui a mis sur la piste.

**`major` — le compteur du panier n'était jamais annoncé.**
`aria-label="Panier"` sur le `<Link>` de la navbar écrase le contenu : le nom
accessible valait « Panier », quel que soit le nombre d'articles. La pastille
portait bien un `aria-label`, mais sur un `<span>` sans rôle — non exposé de façon
fiable par les lecteurs d'écran, y compris là où il n'était pas écrasé (bottom-nav).

**`major` — le numéro de téléphone du footer était recopié en dur.**
`+226 60 55 44 00` en constante de module. Vérification faite, il correspond bien au
`whatsapp_config` en base (le HTML prérendu affiche la même valeur après
correction) : ce n'était donc pas un fait inventé, mais une copie qui serait devenue
fausse dès le premier changement depuis `/admin/whatsapp`.

**`minor` — deux cibles tactiles sous le plancher de 44px** (`components.md` :
« jamais < 44px de haut sur mobile ») : la barre de recherche de la navbar (`py-2`
→ ~40px) et le bouton de fermeture du drawer (`icon-sm` = 28px, défaut shadcn) —
soit l'entrée de la recherche et la sortie du menu, sur mobile.

**`minor` — copie cassée.** « Boutique en ligne . Vous commandez » : point orphelin
et double espace laissés par le retrait d'une ville. `content-and-copy.md` impose
`[… — À COMPLÉTER]` pour un fait dur, pas une phrase amputée.

**`nit`** — `sr-only "Close"` en anglais ; grappe d'icônes de la navbar en `<nav>`
sans libellé (3ᵉ landmark de navigation) ; `rounded` brut sur le chip `⌘K` ;
barre légale du footer collée en colonne 0.

## 4. Travaux livrés

| Fichier | Changement |
|---|---|
| `mobile-bottom-nav.tsx` | Fallback en `<Link>` réutilisant `ItemInner` — markup identique, aucun layout shift. |
| `navbar.tsx` | `aria-label` retiré du lien panier, nom recomposé (`sr-only` + pastille) ; grappe d'icônes en `<div>`. |
| `cart-badge.tsx` | `aria-label` sur `<span>` → texte `sr-only` réel ; chiffre visible passé `aria-hidden`. |
| `footer.tsx` | `Footer` devient `async`, lit `getWhatsappConfig()` ; `formatPhone()` E.164 → `+226 XX XX XX XX` ; repli `[Téléphone — À COMPLÉTER]` ; copie et indentation. |
| `search-modal.tsx` | `SearchTrigger` en `h-11` ; `rounded` → `rounded-ls-xs` ; durée tokenisée. |
| `ui/sheet.tsx` | Bouton de fermeture en `size-11` ; « Close » → « Fermer ». |
| `logo.tsx` | Commentaire corrigé (il annonçait Cloudinary comme cible). |
| `docs/design/layout-and-chrome.md` | Doc alignée sur le code (README : le code fait foi). |

## 5. Points de vigilance relevés en vérification

- **Le `Footer` devient `async` dans le layout.** Vérifié que les pages restent en
  prérendu partiel (`◐` dans la sortie de build) : `getWhatsappConfig()` est
  `'use cache'`, donc awaitable au prérendu sans rendre le layout dynamique.
- **Un premier constat a dû être corrigé.** Le numéro du footer avait d'abord été
  qualifié de « fait dur inventé » (violation de `content-and-copy.md`). Le HTML
  prérendu a montré qu'il correspondait au numéro réellement configuré : le défaut
  est une duplication, pas une invention. Sévérité et rédaction revues en
  conséquence, dans le commit comme ici.
- **La pastille du panier n'est pas rendue dans le fallback de la bottom-nav**,
  délibérément : la faire vivre dans les deux branches ferait traverser la même
  frontière `<Suspense>` à deux positions différentes. Comportement inchangé.

## 6. Dette laissée ouverte (constatée, non corrigée)

- **Le logo est le dernier asset servi par Cloudinary** alors que les médias sont
  passés sur ImageKit — et il est chargé sur *toutes* les pages, en `priority`.
  Rien n'est cassé (le loader garde la branche héritée `/upload/`), mais c'est cet
  unique asset qui retient la dépendance. Ré-héberger demande l'accès au compte :
  signalé dans le code, pas corrigé.
- **`+226 60 55 44 00` reste recopié** dans `legal-page.tsx`, `mentions-legales`,
  `cgv`, `confidentialite` — quatre copies qui dériveront. Hors périmètre du bloc 1
  (pages légales), à reprendre à la passe contenu.
- **`useSession()` est appelé dans `MobileBottomNav` et `AdminNavLink`** sur chaque
  page storefront, pour un visiteur anonyme, uniquement pour décider d'afficher un
  onglet Admin. Une requête réseau par page. À trancher au bloc transverse
  performance.
- **`ui/sheet.tsx` anime en `transition duration-200 ease-in-out`** — `transition`
  nu (toutes propriétés, interdit par `motion.md`) et une durée hors token
  (`--duration-ls-sheet` = 280ms). Primitive vendorisée partagée avec les blocs 3
  et 5 : à traiter d'un coup, pas bloc par bloc.
- **`<Button size="default">` fait 32px de haut** (baseline shadcn), sous le
  plancher de 44px. Sans effet sur le bloc 1 ; à vérifier aux blocs 5 et 6, où les
  formulaires soumettent avec ce composant.
- **Pas de lien d'évitement** (« aller au contenu ») ni d'`id` sur le `<main>` :
  au clavier, toute la chrome se traverse avant le contenu. Relève du bloc
  transverse accessibilité.
- **Le `<h2>` de la bande 1 du footer est en `text-[22px]`** là où l'échelle home
  dit `text-[26px]` via `SectionHeader`. Le motif (filet + eyebrow + `h2`) est
  respecté ; écart assumé pour de la chrome sous la ligne de flottaison.

## 7. Vérification

```
npm run lint       ✓
npm run typecheck  ✓
npm run build      ✓   (25 pages, prérendu partiel conservé)
grep -rc "border-radius:--radius" .next/static/**/*.css   → 0
```

Vérifications faites sur l'artefact, pas sur l'intention :

- `.next/server/app/index.html` contient bien `<a href="/">`, `<a href="/catalogue">`…
  dans la bottom-nav (auparavant des `<div>`).
- le même fichier affiche `+226 60 55 44 00 (WhatsApp)` dans le footer — donc
  `getWhatsappConfig()` résout au prérendu, et `formatPhone()` restitue exactement
  le format attendu.
- `[Ville — À COMPLÉTER]` présent, `grep "À COMPLÉTER" src/` à jour.

**La migration `drizzle/0006` n'a pas été appliquée.** Le relais la demande avant
tout, mais elle touche la base distante : décision utilisateur. Le build passe sans
elle et le bloc 1 ne lit aucune colonne concernée ; les blocs 5 et 6 (panier/tunnel,
compte/commandes) ne pourront pas être audités tant qu'elle n'est pas passée.

## 8. Suite

Bloc 2 — **Home** (`hero`, `catalog-rail`, `category-showcase`, `home-sections`,
`(storefront)/page.tsx`), la référence de cohérence dont les blocs suivants
réutilisent le vocabulaire.
