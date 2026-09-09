/**
 * src/lib/whatsapp/index.ts
 * Agent : Logique métier
 * Rôle  : Formatage de l'URL wa.me à partir de WhatsappConfig (singleton, lu via dbAdmin).
 *         Aucun appel API WhatsApp — lien direct uniquement (modèle vitrine).
 */

import { dbAdmin } from '@/lib/db/client'
import { whatsappConfig } from '@/lib/db/schema'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface WaMessageParams {
  orderId: string
  orderUrl: string        // ex. https://louisa.shop/commandes/<id>
  customerName: string
  items: Array<{
    productName: string
    sku: string
    size?: string | null
    color?: string | null
    qty: number
    unitPrice: number     // FCFA, entier
  }>
  total: number           // FCFA, entier
  paymentMethod: 'mobile_money_orange' | 'mobile_money_moov' | 'cod'
}

const PAYMENT_LABELS: Record<WaMessageParams['paymentMethod'], string> = {
  mobile_money_orange: 'Orange Money',
  mobile_money_moov:   'Moov Money',
  cod:                 'Paiement à la livraison',
}

// ─────────────────────────────────────────────
// Lecture config (singleton id=1)
// ─────────────────────────────────────────────

export async function getWhatsappConfig() {
  const [config] = await dbAdmin
    .select()
    .from(whatsappConfig)
    .limit(1)

  if (!config) {
    throw new Error('WhatsappConfig introuvable — configurez le numéro dans /admin/config')
  }
  return config
}

// ─────────────────────────────────────────────
// Formatage du message pré-rempli
// ─────────────────────────────────────────────

function formatMessage(params: WaMessageParams): string {
  const { orderId, orderUrl, customerName, items, total, paymentMethod } = params

  const lignes = items.map((item) => {
    const variante = [item.size, item.color].filter(Boolean).join(' / ')
    return `• ${item.productName}${variante ? ` (${variante})` : ''} — SKU ${item.sku} × ${item.qty} = ${(item.unitPrice * item.qty).toLocaleString('fr-FR')} FCFA`
  })

  return [
    `Bonjour, je viens de passer la commande n° ${orderId}.`,
    '',
    `Client : ${customerName}`,
    `Règlement souhaité : ${PAYMENT_LABELS[paymentMethod]}`,
    '',
    'Récapitulatif :',
    ...lignes,
    '',
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
 * Lit le numéro depuis WhatsappConfig (dbAdmin) — jamais hardcodé.
 *
 * @returns URL complète prête à passer en window.location ou <a href>
 */
export async function buildWhatsappUrl(params: WaMessageParams): Promise<string> {
  const config = await getWhatsappConfig()

  // Numéro normalisé : on accepte "0022670000000" ou "+22670000000"
  // wa.me attend le format international sans le +
  const numero = config.numero.replace(/^\+/, '').replace(/\s/g, '')

  const message = formatMessage(params)
  const encoded = encodeURIComponent(message)

  return `https://wa.me/${numero}?text=${encoded}`
}