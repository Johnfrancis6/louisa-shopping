# ImageKit — mise en place

Procédure à suivre **dans l'ordre**. Endpoints et syntaxe de transformation
vérifiés sur `imagekit.io/docs` en septembre 2026.

---

## 1. Relever les trois valeurs

Tout est au même endroit : **Dashboard → Developer options**.

### `IMAGEKIT_PRIVATE_KEY` — la seule réellement indispensable

Voir ci-dessous. Les deux autres variables sont documentées pour la suite.

### `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT`

Onglet **URL endpoints**. De la forme `https://ik.imagekit.io/<votre_id>`.
Public par nature (c'est la base de toutes vos URLs d'images), d'où le préfixe
`NEXT_PUBLIC_`. **Sans barre oblique finale.**

> Le code actuel ne la lit pas : l'URL de livraison est celle que renvoie
> l'API au moment de l'upload. Renseignez-la quand même — elle servira pour
> l'upload côté navigateur, et elle documente le compte utilisé.

### `IMAGEKIT_PRIVATE_KEY`

Onglet **API keys**, préfixe `private_`.

C'est un **secret** : il autorise l'upload ET la suppression. Ne le commitez
jamais, ne le préfixez jamais `NEXT_PUBLIC_`.

### `NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY`

Même page, préfixe `public_`. Non secret. Il ne sert **pas encore** : il sera
nécessaire le jour où l'upload passera côté navigateur (pour dépasser les
8 Mo). Vous pouvez le renseigner tout de suite ou laisser vide.

---

## 2. Vérifier un réglage de sécurité

Dans les réglages d'images de votre compte, si l'option **« Restrict unnamed
image transformations »** (ou équivalent) est **activée**, ImageKit refusera
les transformations passées en `?tr=…` et ne servira que des transformations
nommées.

Notre loader utilise exactement cette syntaxe. Si l'option est active, **toutes
les images seront servies en pleine résolution** — le job Lighthouse en CI
(perf mobile ≥ 85, LCP < 2,5 s, bloquant) échouera.

👉 Laissez cette option **désactivée**. C'est le réglage par défaut ; vérifiez
simplement que personne ne l'a changée.

---

## 3. Renseigner les variables d'environnement

### En local — `.env.local`

```bash
NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/votre_id
NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY=public_xxxxxxxxxxxx
IMAGEKIT_PRIVATE_KEY=private_xxxxxxxxxxxx
```

### Sur Netlify

Site settings → **Environment variables** → ajouter les trois.
`NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT` est lu **au build** : après l'avoir
ajoutée, relancez un déploiement, sinon la valeur ne sera pas dans le bundle.

### Sur GitHub Actions

Le job `quality` (lint → typecheck → build) construit le site : ajoutez les
trois en **Actions Secrets**, comme les autres.

---

## 4. Appliquer les migrations

Deux migrations sont en attente :

| Fichier | Contenu |
|---|---|
| `0004_slim_hellfire_club.sql` | index unique partiel sur `stock_ledger` (filet anti double décrément de stock) |
| `0005_marvelous_chimera.sql` | table `home_block` + enum `home_slot` (contenu éditorial de la home) |

**Avant d'appliquer `0004`**, vérifiez qu'aucun doublon n'existe déjà — la
création d'un index unique échoue sinon :

```sql
select order_id, variant_id, reason, count(*), sum(delta)
from stock_ledger
where order_id is not null
group by 1,2,3 having count(*) > 1;
```

Si la requête ne renvoie rien :

```bash
npm run db:deploy   # = drizzle-kit migrate && node scripts/apply-policies.mjs
```

`apply-policies.mjs` est **indispensable** : il pose le `GRANT SELECT` et la
policy `home_block_public_read`. Sans lui, la table existe mais `dbAnon` ne
voit rien, et la home continuera d'afficher le contenu de repli sans erreur
visible — c'est le piège le plus probable de cette mise en place.

> Aucune migration n'est nécessaire pour le changement de fournisseur :
> `media.publicId` et `home_block.imageId` sont des colonnes `text`, elles
> portent désormais un `fileId` ImageKit au lieu d'un `public_id` Cloudinary.

---

## 5. Charger les visuels

Tout passe par le back-office, aucun code à toucher :

**`/admin/home`** — quatre sections :

| Section | Ce qu'elle pilote | Nb de blocs |
|---|---|---|
| Bannière (hero) | l'image plein écran, le titre, le bouton | 1 visible |
| Carrousel « Sélections » | les blocs qui défilent | 4 à 8 |
| Actualités | les 3 cartes du bas | 3 |
| Illustrations « Comment ça marche » | les 3 vignettes du parcours | 3 |

Pour chaque bloc : **créer** (titre + lien) → **Ajouter une image** → ajuster
l'accroche → **Enregistrer**.

Le **titre et l'accroche du carrousel s'affichent par-dessus l'image**, en haut
du bloc : prévoyez des visuels dont la partie supérieure est calme (ciel, mur,
fond uni), sinon le texte deviendra illisible.

**`/admin/products/[id]`** — les photos produit, même mécanique.

Tout arrive dans le dossier `/louisa-shopping` de votre médiathèque ImageKit,
avec un nom unique (deux `photo.jpg` ne s'écrasent pas).

### Formats conseillés

| Emplacement | Ratio | Largeur source |
|---|---|---|
| Hero | 16/9 ou plus large | ≥ 2000 px |
| Carrousel | 4/5 (portrait) | ≥ 1200 px |
| Actualités | 16/10 | ≥ 1200 px |
| Process | 4/3 | ≥ 900 px |
| Produit | 1/1 ou 4/5 | ≥ 1200 px |

Envoyez l'original : ImageKit redimensionne et convertit en AVIF/WebP à la
livraison. Inutile de compresser en amont. **Limite d'upload : 8 Mo** par
fichier (`serverActions.bodySizeLimit`).

---

## 6. Vérifier

```bash
npm run verify   # lint + typecheck + build
```

Puis, sur le site :

1. La home affiche vos visuels (et non les tuiles grises / l'image de démo).
2. Clic droit sur une image → « Copier l'adresse » : l'URL doit ressembler à
   `https://ik.imagekit.io/<id>/louisa-shopping/photo_abc.jpg?tr=w-828,q-82,f-auto,c-at_max`.
   **Pas de `?tr=`** → le loader n'est pas pris en compte (vérifiez
   `next.config.ts` et l'étape 2).
3. Onglet Réseau : les images doivent arriver en `image/avif` ou `image/webp`.

---

## Ce que le code fait déjà

| Fichier | Rôle |
|---|---|
| `src/lib/images/loader.ts` | loader `next/image`. Ajoute `?tr=w-…,q-…,f-auto,c-at_max`. Gère **aussi** les anciennes URLs Cloudinary (seed de démo) — rien à migrer dans l'urgence. |
| `src/lib/images/imagekit.ts` | upload (`POST upload.imagekit.io/api/v1/files/upload`), suppression (`DELETE api.imagekit.io/v1/files/<fileId>`), auth Basic clé privée |
| `src/lib/actions/admin/home.ts` | CRUD des blocs + upload, remplace l'ancienne image à chaque changement |
| `src/lib/actions/admin/media.ts` | photos produit |
| `src/lib/data/home.ts` | lecture publique cachée (`'use cache'`, tag `home`) |
| `next.config.ts` | `remotePatterns` : `ik.imagekit.io` + `res.cloudinary.com` |

## Limites connues

- **Le `fileId` est obligatoire pour supprimer.** Contrairement à Cloudinary,
  l'URL ImageKit ne contient pas l'identifiant : impossible de le redériver.
  Il est stocké à l'upload (`media.publicId`, `home_block.imageId`). Une ligne
  sans `fileId` (héritage) verra son asset distant rester en place — un
  avertissement est loggé.
- **Vidéo non branchée.** `uploadAndAddMedia` refuse explicitement
  `type: 'video'` : les 8 Mo de `bodySizeLimit` ne suffisent pas. Il faudra un
  upload signé côté navigateur (c'est là que `NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY`
  servira).
- **Le paquet npm `cloudinary` est encore installé** mais plus importé nulle
  part. À retirer de `package.json` quand vous voudrez.
