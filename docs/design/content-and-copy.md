# Contenu & copie

## Contexte produit

E-commerce **mobile-first**, **marché Burkina Faso**, **un seul marchand**.
Catalogue → panier → checkout qui **hand-off vers WhatsApp** (pas de paiement en
ligne). Paiement à la livraison (Orange Money, Moov Money, espèces). Livraison par
zone (frais/délais affichés sur le produit).

## Langue & ton

- **Français**, tutoiement/vouvoiement : **vouvoiement** (« Vous commandez, on
  vous livre »). Cohérent avec le code actuel.
- Ton : direct, concret, rassurant. Pas de jargon e-commerce interchangeable
  (« Bienvenue sur notre boutique »). Chaque phrase parle de CE marchand : zones
  de livraison, confirmation WhatsApp, paiement à la réception.
- Typographie française : espace insécable avant `? ! : ;` et `«  »`, apostrophe
  courbe `’`, « … » (vrai caractère). Dans le JSX, échapper l'apostrophe droite
  (`&apos;`) ou utiliser l'apostrophe courbe directement.

## Placeholders — règle

Le contenu actuel est un **brouillon** pour juger la cohérence visuelle. Deux cas :

| Type | Traitement |
|---|---|
| Copie structurelle (accroches, descriptions, titres de section) | **rédigée** en brouillon (à faire valider, pas bloquant) |
| Faits durs : adresse, téléphone, e-mail, **ville**, prix exacts, dates précises, mentions légales, URLs réseaux | **restent `[… — À COMPLÉTER]`** ou `href="#"` — ne jamais inventer |

`grep -rn "À COMPLÉTER" src/` liste ce qui reste à remplir.

## Vert WhatsApp — rappel

`#25D366` = **uniquement** le bouton « Confirmer sur WhatsApp » de
`src/app/(storefront)/commandes/[id]/page.tsx`. Le hand-off WhatsApp est l'action
de conversion réelle → il porte la couleur reconnaissable. Tout le reste est
monochrome + violet.

## Accroches catégories (home)

Map par slug dans `src/components/storefront/home/category-showcase.tsx`
(`TAGLINES`). Fallback générique si le slug n'est pas dans la map. Slugs connus
(seed `src/lib/db/seed.ts`) : `electromenager`, `sacs-a-main`,
`fitness-velos-de-sport`, `vetements-homme`, `vetements-femme`, `etageres`,
`sacs-isothermes`, `tenues-fillettes`, `plats`, `climatiseurs`.

## Données mock

`src/lib/data/*` et les actions catalogue lisent la **vraie DB** (Drizzle/Supabase)
sur cette branche. `src/lib/mock/` et `MOCK_*` sont résiduels — ne pas s'appuyer
dessus. `searchProducts` matche le **nom OU le SKU** d'une variante.
