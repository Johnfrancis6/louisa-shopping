# SR-PTD — Audit frontend par blocs

**Date** : 2026-09-16
**Branche** : `fix/backend-audit-livraison`
**Blocs traités** : 1 (layout & navigation) · 2 (home) · 3 (catalogue)
**Commits** : `048ddc8`, `f4c849f`, `a16d17e`, `42620a3`, `b2137ab`, `d40f118`,
`b2301be`

> **Migration `drizzle/0006`** — le relais demandait de l'appliquer avant tout.
> Vérification faite (2026-09-16) : elle l'**était déjà**. 7 migrations
> enregistrées, `delivery_fee` / `delivery_zone_label` et l'index unique
> `review_customer_product_uniq` en place, 0 doublon de `review`.
> `npm run db:migrate` confirme, sans rien appliquer.

---

# Bloc 1 — layout & navigation

**Périmètre** : chrome storefront — `navbar`, `nav-links`, `nav-drawer`,
`mobile-bottom-nav`, `footer`, `logo`, `cart-badge`, `admin-nav-link`,
`src/app/layout.tsx`, `(storefront)/layout.tsx`, `(storefront)/template.tsx`
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

Bloc 2 — **Home**, ci-dessous.

---

# Bloc 2 — home

**Périmètre** : `hero`, `catalog-rail`, `category-showcase`, `home-sections`,
`(storefront)/page.tsx` — la référence de cohérence du storefront.
**Commit** : `a16d17e`

## 1. Ce qui était conforme

Contrôlé point par point contre `docs/design/`, et conforme : le rythme des fonds
(blanc → gris → violet → blanc → gris, jamais deux teintes fortes de suite), le
`SectionHeader` réutilisé dans les quatre sections de contenu, l'échelle typo
bespoke de la home (hero `text-3xl md:text-5xl` + `text-ls-violet-hero`, `h2` en
`text-[26px]`, eyebrows), un seul `<h1>`, aucun rayon hors échelle, aucune fuite
de palette, `ls-glow` et `ls-dots` posés là où la doc les attend, `ls-reveal`
absent du premier écran, `motion-safe:` sur le chevron du hero.

Deux vérifications qui n'ont **rien** donné, mentionnées pour qu'on ne les
refasse pas : `bg-gradient-to-t` (syntaxe Tailwind v3) compile correctement en v4
— l'alias est conservé, le CSS produit est bien un `linear-gradient` ; et le repli
du hero ne charge aucune image de démo, contrairement à ce que dit son en-tête de
fichier.

## 2. Constats — le carrousel concentre les défauts

**`major` — le défilement auto reprenait la main sur mobile.**
Le rail avance toutes les 4,2 s. Il se figeait au survol (`onMouseEnter`) et au
focus — deux événements qui n'existent pas sur un téléphone. Sur la plateforme
cible, la piste se déplaçait donc pendant qu'on lisait une carte ou qu'on la
visait du doigt. Corrigé par un arrêt **définitif** à la première interaction,
quelle qu'elle soit.

**`major` — la flèche « suivant » ne se désactivait jamais.**
`atEnd` valait `index >= items.length - 1`, où `index` est le bloc le plus proche
du bord gauche. Le dernier bloc n'atteint jamais ce bord (il se cale à droite en
fin de piste) : la condition n'était donc jamais vraie. En bout de course, la
flèche restait active et sans effet. Le plus notable : l'autoplay, trois lignes
plus haut dans le même fichier, mesurait déjà correctement la fin de piste sur
`scrollLeft + clientWidth >= scrollWidth`. Deux critères concurrents dans un même
composant, un juste et un faux.

**`major` — les puces faisaient 6px de haut.**
`h-1.5`, soit une cible de 6×6px pour les puces inactives — et c'est le **seul**
contrôle du carrousel sur mobile, les flèches étant en `md:`. La pastille visible
reste à 6px, le `<button>` qui la porte passe à `h-11 w-6`.

**`minor` — trois liens « Lire → » qui ne menaient nulle part.**
Les cartes d'actualité pointaient sur `/#actualites`, c'est-à-dire sur la section
qui les contient. Un lien d'apparence active, qui ne fait rien. Rendu seulement
si `home_block.href` existe.

**`minor` — dates inventées.** « 5 septembre 2026 », « 28 août 2026 »,
« 20 août 2026 » dans le repli des actualités, avec un commentaire qui l'assumait
(« exemples réalistes à confirmer »). `content-and-copy.md` classe une date
précise parmi les faits durs qu'on n'invente pas.

**`nit`** — `h3` d'actualité en `font-medium` là où l'échelle dit `font-semibold` ;
`transition-shadow` mort dans le showcase (aucune ombre ne change) ; commentaire
de type « URL Cloudinary » dans le rail alors que les médias sont sur ImageKit.

## 3. Travaux livrés

| Fichier | Changement |
|---|---|
| `catalog-rail.tsx` | Arrêt définitif de l'autoplay à la première interaction ; bords mesurés sur le défilement réel (+ mesure initiale et `ResizeObserver`) ; puces à 44px de haut ; commentaire de type corrigé. |
| `home-sections.tsx` | Lien « Lire » conditionné à une vraie destination ; dates → `[Date — À COMPLÉTER]` ; `h3` en `font-semibold` ; flèches décoratives `aria-hidden`. |
| `category-showcase.tsx` | `transition-shadow` mort retiré. |
| `docs/design/{motion,components,sections-and-backgrounds}.md` | Ligne « Sélections » au rythme des fonds ; entrée autoplay + règle d'arrêt ; anatomie du rail. |

## 4. Points de vigilance relevés en vérification

- **`bg-gradient-to-t` a failli être signalé à tort.** C'est de la syntaxe
  Tailwind v3 ; v4 la conserve en alias. Vérifié dans le CSS compilé avant
  d'écrire quoi que ce soit — aucune correction nécessaire.
- **L'arrêt de l'autoplay se déclenche avant le filtre `pointerType`.** Le
  gestionnaire `onPointerDown` sortait tôt pour le tactile (à raison : le geste
  natif ne doit pas être intercepté). L'appel à `stopAutoplay()` est donc placé
  **avant** ce retour, sinon le cas mobile — celui qui motive la correction —
  n'aurait rien changé.
- **Vérifié sur le HTML prérendu**, pas sur l'intention : 6 puces en `h-11 w-6`,
  zéro occurrence de « Lire », 3 placeholders de date, `h3` en `font-semibold`, et
  `/#actualites` ne subsiste que dans les liens de navigation.

## 5. Dette laissée ouverte

- **Pas de bouton pause visible sur le rail.** L'arrêt à la première interaction
  règle le problème réel, pas la lettre de WCAG 2.2.2, qui demande un mécanisme
  explicite. Deux issues : ajouter un bouton, ou supprimer le défilement auto —
  qui n'est documenté nulle part comme une décision de design. Consigné dans
  `motion.md`.
- **Les trois cartes SAV pointent toutes sur `/#contact`** alors qu'elles
  annoncent « En savoir plus ». Le libellé promet un approfondissement et livre un
  bloc de contact. Non corrigé : le bon geste est soit de relibeller, soit de
  créer les pages de destination — un arbitrage éditorial, pas technique.
  Consigné dans `components.md`.
- **Le showcase rend une grande image par catégorie, sans limite.** Avec les 10
  catégories du seed, la home empile 10 images `aspect-[3/2]` pleine colonne.
  Elles sont en `loading="lazy"`, mais la home est la page que la CI mesure
  (Lighthouse mobile ≥ 85, LCP < 2,5 s). À surveiller au bloc transverse
  performance.
- **`category.image_url` est en snake_case** dans la couche `data`, seul endroit
  où la convention camelCase du projet n'est pas tenue. Cosmétique.
- **`ls-reveal` n'est posé que sur le showcase**, pas sur les cartes process /
  SAV / actualités. La doc ne l'impose que sur « les éléments répétés qui entrent
  par le bas » ; l'écart est défendable mais n'est pas un choix explicite.

## 6. Vérification

```
npm run lint       ✓
npm run typecheck  ✓
npm run build      ✓   (prérendu partiel conservé)
grep -c "border-radius:--radius" .next/static/chunks/*.css   → 0
```

## 7. Suite

Bloc 3 — **Catalogue**, ci-dessous.

---

# Défaut système — les cinq utilitaires typo étaient morts

**Commit** : `b2137ab`. Trouvé pendant le bloc 3, mais il ne lui appartient pas :
il touche tout le storefront, y compris les blocs 1 et 2 déjà passés.

## Le défaut

`--text-ls-h1/h2/body/label/price` sont des raccourcis **`font`**
(weight/size/line-height/family). Ils vivaient dans `@theme`, où le namespace
`--text-*` de Tailwind v4 génère un utilitaire **`font-size`**. Résultat compilé :

```css
.text-ls-h1 { font-size: 500 1.5rem/1.3 var(--font-ls-sans) }  /* invalide */
```

`font-size` n'accepte qu'une longueur. La déclaration est invalide à la
substitution, donc écartée, et la propriété retombe sur l'héritage. Les cinq
utilitaires ne faisaient **rien**, sur environ 130 usages.

Ce qui était réellement à l'écran :

| Élément | Attendu | Rendu |
|---|---|---|
| Tous les `<h1>` du storefront | 24px / 500 | **15px**, la taille du corps |
| `<h2>` en `text-ls-h2` | 18px / 500 | 15px |
| Prix de la fiche produit | 18px / 500 | 15px |
| 51 `text-ls-label` | 12px / 500 | 15px / 400 |

Le preflight Tailwind neutralise la taille par défaut des titres, donc rien ne
rattrapait la règle écartée. Pages concernées : `/catalogue`, `/produits/[slug]`,
`/compte`, `/connexion`, `/inscription`, `/commander`, `/commandes/[id]` et les
trois pages légales.

**Pourquoi personne ne l'a vu** : le corps de texte, lui, était juste — par
accident. `@layer base { body { font: var(--text-ls-body) } }` fait le travail
avec le raccourci correct. Tout le texte courant tombait donc à la bonne taille,
et seuls les titres étaient trop petits — un défaut qui se lit comme un choix de
design sobre.

## La correction

Tokens sortis de `@theme` vers `:root`, utilitaires déclarés à la main.

**En `@layer components`, pas en `@utility`** — et c'est le point qui a demandé
une deuxième passe. `font:` est un raccourci : il réinitialise `font-weight`. Une
première version en `@utility` plaçait `.text-ls-label` **après** `.font-semibold`
dans la feuille compilée (positions 41616 contre 30122), à spécificité égale : le
raccourci aurait écrasé le poids des **23 éléments** qui écrivent les deux
ensemble (`text-ls-label font-semibold`). La couche `components` passe avant
`utilities` — le token pose la taille et un poids par défaut, un `font-*`
explicite garde le dernier mot. Vérifié sur les positions réelles après rebuild
(9402 contre 30363).

Même famille de piège que `rounded-[--radius-ls-md]` : un token qui est un
raccourci ne peut pas vivre dans un namespace `@theme` mono-propriété. Consigné
dans `typography.md` (piège nº 2) et `tokens.md`.

## Ce que ça dit de l'audit

Les blocs 1 et 2 sont passés à côté. Les deux ont vérifié les rayons dans le CSS
compilé — le piège documenté — sans se demander si le *même* piège frappait
ailleurs. Il a fallu voir un `<h1>` sans autre classe de taille sur `/catalogue`
pour ouvrir le CSS. Règle à garder pour les blocs suivants : **vérifier qu'un
utilitaire maison produit la règle attendue**, pas seulement qu'il est présent.

---

# Bloc 3 — catalogue

**Périmètre** : `catalogue-toolbar`, `sort-control`, `filters-sheet`,
`active-filters`, `category-grid`, `product-grid`, `product-card`,
`(storefront)/catalogue/page.tsx`, `lib/utils/catalog-filters.ts`.
**Commit** : `d40f118`

## 1. Le point de départ

`docs/design/catalogue-refonte.md` — non lu par les blocs précédents — portait une
**« étape 6 — RESTE À FAIRE »** de quatre points, écrite en 2026-09-09 et jamais
faite. Vérification au code : les quatre étaient bien encore ouverts. Le bloc 3
consiste donc autant à finir cette refonte qu'à l'auditer.

Le reste est sain : `catalog-filters.ts` normalise et **borne** toute entrée
externe avant qu'elle n'atteigne une fonction `'use cache'` (longueur,
cardinalité, plage, tri canonique) — la clé de cache ne peut pas être gonflée
depuis l'URL ; le tri est un `<select>` natif ; les tranches de prix sont
cohérentes avec leurs libellés ; `countActiveFilters` exclut à raison catégorie et
tri.

## 2. Constats

**`major` — le panneau de filtres gardait un état périmé.**
Ses `useState` ne lisent l'URL qu'au montage, et le composant ne se démonte pas
quand l'URL change. Retirer un filtre par une chip, puis rouvrir le panneau :
l'ancienne sélection était toujours affichée, et « Voir les résultats » la
réappliquait — le retrait était purement et simplement annulé. Le journal de
refonte affirmait que `bracketFor()` « re-sélectionne à l'ouverture » ; c'est
faux, un `useState(initial)` ne se réévalue jamais. Panneau passé en contrôlé,
re-synchronisé à chaque ouverture.

**`minor` — double chargement possible au défilement.**
La garde de `loadMoreProducts` était `isPending`, lu dans la closure de
l'`IntersectionObserver`. Entre deux franchissements de la sentinelle, l'état peut
ne pas encore avoir été recalculé : la même page s'ajoutait deux fois, avec des
clés React dupliquées. Passée en `ref`.

**`minor` — deux skeletons qui décalent la page.** Celui des résultats rendait des
blocs `aspect-[3/4]` là où la card réelle est nom → image carrée → ligne prix ; et
sa toolbar ne s'empilait pas sous `sm:` comme la vraie. Celui des catégories
omettait le titre « Catégories », poussant toute la page à l'arrivée du contenu.

**`minor` — chips de filtres à `h-9`.** Le journal de refonte le savait et le
justifiait par la cohérence avec « les autres contrôles de filtre ». Or le tri, le
bouton « Filtres » et les toggles du panneau sont tous à `h-11` : les chips
étaient à la fois sous le plancher tactile et incohérentes.

**Étape 6, points 2 et 3** — état vide réduit à un `<p>` centré, sans issue quand
des filtres ne donnent rien ; et pagination infinie sans bouton ni région
d'annonce, donc invisible et inatteignable autrement qu'en faisant défiler.

## 3. Travaux livrés

| Fichier | Changement |
|---|---|
| `product-grid.tsx` | Réécrit : état vide façon carte SAV + lien « Réinitialiser les filtres » ; bouton « Charger plus de produits » ; région `role="status"` ; verrou de chargement en `ref` ; rattrapage d'un échec de pagination. |
| `filters-sheet.tsx` | `Sheet` contrôlé, re-synchronisation du formulaire sur l'URL à chaque ouverture. |
| `catalogue/page.tsx` | `CatalogueResultsSkeleton` calqué sur la card et la toolbar réelles. |
| `category-grid.tsx` | Titre « Catégories » ajouté au skeleton. |
| `active-filters.tsx` | Chips et « Tout effacer » à `h-11`. |
| `docs/design/*` | Journal de refonte à jour ; tuile active en violet ; anatomie du panneau latéral ; contradiction `ls-reveal` levée. |

## 4. Points de vigilance relevés en vérification

- **Le lien « Réinitialiser les filtres » est un `<Link>`, pas un bouton.** Le
  journal proposait d'extraire `FILTER_PARAMS` dans `catalog-filters.ts` pour le
  reconstruire côté client. Inutile : l'URL cible se dérive de `filters` avec
  `catalogFiltersToSearchParams` en gardant `categorie` et `tri`. Un vrai lien,
  qui marche au clavier et sans JS, sans duplication de la liste des paramètres.
- **`git add src/` a happé `product-card.tsx`** (WIP utilisateur) au moment de
  préparer le commit. Rattrapé avant de committer — le fichier est intact et
  toujours non committé. Stager fichier par fichier tant que ce WIP existe.

## 5. Dette laissée ouverte

- ~~**`product-card.tsx`, non touché** (WIP utilisateur).~~ **Résolu**
  (`b2301be`) — voir la section ci-dessous.
- **Échec du premier chargement du catalogue** indistinguable de « aucun
  résultat » : `getProducts` catch en `{ items: [], total: 0 }`. Il faudrait un
  flag `error` au retour — ça touche la couche données, hors périmètre d'un bloc
  frontend.
- **`shadow-ls-sheet`** est encore décrit dans `tokens.md` comme le token du
  bottom sheet des filtres. Le panneau est devenu latéral et ne l'utilise plus ;
  plus personne ne l'utilise. À supprimer ou réaffecter.
- **`SortControl` et le `<select>` prix du panneau dupliquent** le markup
  `<select> + ChevronDown` — dette déjà notée par le journal de refonte, laissée
  telle quelle (deux occurrences, pas trois).
- **`getProducts` charge tout le catalogue puis pagine en mémoire** (déjà dans les
  « Known rough edges » de `CLAUDE.md`). Avec le bouton « Charger plus », la
  pagination devient une action explicite : ça ne l'aggrave pas, mais ça ne le
  règle pas.

## 6. Vérification

```
npm run lint       ✓
npm run typecheck  ✓
npm run build      ✓
grep -c "border-radius:--radius" .next/static/chunks/*.css   → 0
grep -o "\.text-ls-h1{[^}]*}" .next/static/chunks/*.css     → font:var(--text-ls-h1)
```

Sur le HTML prérendu de `/catalogue` : nouveau skeleton de card présent, ancien
`aspect-[3/4]` absent, titre du skeleton catégories présent.

## 7. Carte produit — le WIP utilisateur, intégré

**Commit** : `b2301be`.

Le relais interdisait de committer `product-card.tsx` sans l'accord de son
auteur. L'intention a été donnée en cours de bloc 3 : **retirer le SKU pour que
la carte mette le produit en avant sur mobile plutôt que de l'encombrer d'une
référence sans utilité à l'achat rapide** (d'où aussi `inset-4 → inset-1` et
`mt-3 → mt-2`). Décision cohérente avec le système — mobile-first, sobre — et le
SKU reste là où il sert : modale de recherche (« nom · SKU ») et fiche produit.

Trois corollaires que le changement rendait nécessaires, traités avec lui :

- **`overflow-hidden` manquant sur le cadre de l'image.** Il est `rounded-ls-sm`
  mais ne découpait pas son contenu. À `inset-4` l'image n'atteignait jamais les
  coins, donc le défaut dormait ; à `inset-1`, une photo carrée arrive à 4px du
  bord et déborde de l'arrondi. Effet de bord invisible tant qu'on ne change pas
  l'inset — le genre de chose qu'un audit doit attraper au moment du changement.
- **Le nom passe de `<p>` à `<h3>`.** L'écart préexistait, mais le retrait du SKU
  le rend structurant : le nom devient le seul texte identifiant la carte. Aucun
  effet visuel.
- **Bouton rond à 44px sur mobile** (`h-11 md:h-10`) et `aria-label` nommant le
  produit — une grille annonçait vingt boutons « Ajouter au panier »
  indistinguables. L'image passe en `alt=""`, elle répétait le nom.

Le parti pris est écrit en en-tête de fichier **et** dans `components.md`, qui
décrivait encore « nom + SKU en tête ». Sans ça, le SKU se fait ré-ajouter un
jour au nom de la conformité à la doc.

## 8. Suite

Bloc 4 — **Fiche produit** (`product-purchase-experience`, `delivery-zones`,
`reviews-section`, `review-form`, `tutorial-section`). Y vérifier en priorité
l'effet du correctif typo : `<h1>` du produit et `text-ls-price` y retrouvent
leur taille, la mise en page de la fiche n'a jamais été vue avec.
