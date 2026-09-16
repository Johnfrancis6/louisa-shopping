import 'server-only'

/**
 * src/lib/whatsapp/index.ts
 * Agent : Logique métier
 * Rôle  : Formatage de l'URL wa.me à partir de WhatsappConfig (singleton, lu via dbAdmin).
 *         Aucun appel API WhatsApp — lien direct uniquement (modèle vitrine).
 */

import { getWhatsappConfig } from '@/lib/data/whatsapp-config'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface WaDeliveryAddress {
  fullName: string
  phone: string
  city: string
  directions?: string
}

export interface WaMessageParams {
  orderId: string
  orderUrl: string        // ex. https://louisa.shop/commandes/<id>
  customerName: string
  /** Adresse de livraison figée sur la commande — omise si absente */
  deliveryAddress?: WaDeliveryAddress
  items: Array<{
    productName: string
    sku: string
    size?: string | null
    color?: string | null
    qty: number
    unitPrice: number     // FCFA, entier
  }>
  total: number           // FCFA, entier — sous-total + deliveryFee
  deliveryFee: number     // FCFA, entier — frais de la zone choisie
  paymentMethod: 'mobile_money_orange' | 'mobile_money_moov' | 'cod'
}

const PAYMENT_LABELS: Record<WaMessageParams['paymentMethod'], string> = {
  mobile_money_orange: 'Orange Money',
  mobile_money_moov:   'Moov Money',
  cod:                 'Paiement à la livraison',
}

// ─────────────────────────────────────────────
// Formatage du message pré-rempli
// ─────────────────────────────────────────────

function formatMessage(params: WaMessageParams): string {
  const { orderId, orderUrl, customerName, deliveryAddress, items, total, deliveryFee, paymentMethod } = params

  const lignes = items.map((item) => {
    const variante = [item.size, item.color].filter(Boolean).join(' / ')
    return `• ${item.productName}${variante ? ` (${variante})` : ''} — SKU ${item.sku} × ${item.qty} = ${(item.unitPrice * item.qty).toLocaleString('fr-FR')} FCFA`
  })

  const livraison = deliveryAddress
    ? [
        '',
        'Livraison :',
        `${deliveryAddress.fullName} — ${deliveryAddress.phone}`,
        deliveryAddress.city,
        ...(deliveryAddress.directions ? [deliveryAddress.directions] : []),
      ]
    : []

  return [
    `Bonjour, je viens de passer la commande n° ${orderId}.`,
    '',
    `Client : ${customerName}`,
    `Règlement souhaité : ${PAYMENT_LABELS[paymentMethod]}`,
    ...livraison,
    '',
    'Récapitulatif :',
    ...lignes,
    '',
    `Livraison : ${deliveryFee.toLocaleString('fr-FR')} FCFA`,
    `Total : ${total.toLocaleString('fr-FR')} FCFA`,
    '',
    `Suivi de commande : ${orderUrl}`,
  ].join('\n')
}

// ─────────────────────────────────────────────
// Construction de l'URL wa.me
// ─────────────────────────────────────────────

/**
 * Construit le lien wa.me avec message pré-rempli.
 * Lit la config via le lecteur unique `@/lib/data/whatsapp-config`
 * (`dbAnon`, `'use cache'`) — jamais hardcodé, jamais un doublon local.
 *
 * `createOrder` (src/lib/actions/checkout.ts) rattrape l'exception ci-dessous
 * pour renvoyer un avertissement « Numéro WhatsApp non configuré » plutôt que
 * de casser le tunnel : NE PAS remplacer ce throw par un retour silencieux.
 *
 * @returns URL complète prête à passer en window.location ou <a href>
 */
export async function buildWhatsappUrl(params: WaMessageParams): Promise<string> {
  const config = await getWhatsappConfig()
  if (!config) {
    throw new Error('WhatsappConfig introuvable — configurez le numéro dans /admin/whatsapp')
  }

  const message = formatMessage(params)

  // `lienWa` est un lien wa.me pré-construit, saisi et validé côté admin
  // (toujours `https://wa.me/…`, cf. updateWhatsappConfig) — à utiliser tel
  // quel plutôt que de reconstruire depuis `numero`. Il peut déjà porter une
  // query string : on passe par URL/URLSearchParams pour ne jamais produire
  // un second `?`.
  // `new URL` lève sur une valeur malformée : updateWhatsappConfig n'impose
  // qu'un préfixe `https://wa.me/`, et rien n'empêche une ligne écrite
  // directement en base d'être invalide. On retombe alors sur `numero`
  // plutôt que de priver le commerçant de son lien de confirmation.
  if (config.lienWa) {
    try {
      const url = new URL(config.lienWa)
      url.searchParams.set('text', message)
      return url.toString()
    } catch {
      console.error('[whatsapp] lienWa invalide, repli sur numero :', config.lienWa)
    }
  }

  // Repli : `numero` normalisé — on accepte "0022670000000" ou "+22670000000",
  // wa.me attend le format international sans le +.
  const numero = config.numero.replace(/^\+/, '').replace(/\s/g, '')
  const url = new URL(`https://wa.me/${numero}`)
  url.searchParams.set('text', message)
  return url.toString()
}