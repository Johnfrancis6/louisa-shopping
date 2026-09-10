'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createOrder, type DeliveryAddress } from '@/lib/actions/checkout'
import type { CartItem } from '@/lib/actions/cart'
import { formatPrice } from '@/lib/utils/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type PaymentMethod = 'mobile_money_orange' | 'mobile_money_moov' | 'cod'

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'cod', label: 'Paiement à la livraison' },
  { value: 'mobile_money_orange', label: 'Orange Money' },
  { value: 'mobile_money_moov', label: 'Moov Money' },
]

const PHONE_REGEX = /^\+?[0-9\s-]{8,20}$/

type Step = 'adresse' | 'recapitulatif'

function variantLabel(i: CartItem): string {
  return [i.size, i.color].filter(Boolean).join(' / ')
}

export function CheckoutFlow({
  items,
  total,
  defaultAddress,
}: {
  items: CartItem[]
  total: number
  defaultAddress: Partial<DeliveryAddress>
}) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('adresse')

  const [fullName, setFullName] = useState(defaultAddress.fullName ?? '')
  const [phone, setPhone] = useState(defaultAddress.phone ?? '')
  const [city, setCity] = useState(defaultAddress.city ?? '')
  const [directions, setDirections] = useState(defaultAddress.directions ?? '')

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod')
  const [loading, setLoading] = useState(false)

  const address: DeliveryAddress = {
    fullName: fullName.trim(),
    phone: phone.trim(),
    city: city.trim(),
    ...(directions.trim() ? { directions: directions.trim() } : {}),
  }
  const addressValid =
    !!address.fullName && !!address.city && PHONE_REGEX.test(address.phone)

  function goToRecap(e: React.FormEvent) {
    e.preventDefault()
    if (!addressValid) {
      toast.error('Renseignez le nom, un téléphone valide et le quartier/ville.')
      return
    }
    setStep('recapitulatif')
  }

  async function handleConfirm() {
    setLoading(true)
    const res = await createOrder({ address, paymentMethod })
    if (!res.success) {
      setLoading(false)
      toast.error(res.error ?? 'Impossible de finaliser la commande.')
      return
    }
    if (res.warning) toast.warning(res.warning)
    router.replace(`/commandes/${res.orderId}`)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex items-center gap-2 text-ls-label">
        <li className={step === 'adresse' ? 'font-semibold text-ls-gray-900' : 'text-ls-gray-500'}>
          1. Adresse
        </li>
        <li aria-hidden className="text-ls-gray-300">·</li>
        <li className={step === 'recapitulatif' ? 'font-semibold text-ls-gray-900' : 'text-ls-gray-500'}>
          2. Récapitulatif
        </li>
      </ol>

      {step === 'adresse' && (
        <form onSubmit={goToRecap} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-ls-label text-ls-gray-900">Nom complet</span>
            <Input
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-ls-label text-ls-gray-900">Téléphone (WhatsApp)</span>
            <Input
              type="tel"
              required
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-ls-label text-ls-gray-900">Quartier / Ville</span>
            <Input
              required
              autoComplete="address-level2"
              placeholder="Ex. Ouaga 2000, Ouagadougou"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-ls-label text-ls-gray-900">
              Indications complémentaires <span className="text-ls-gray-500">(optionnel)</span>
            </span>
            <Input
              autoComplete="address-line2"
              placeholder="Repères, étage, personne à contacter…"
              value={directions}
              onChange={(e) => setDirections(e.target.value)}
            />
          </label>

          <Button
            type="submit"
            className="h-11 bg-ls-violet text-ls-white hover:bg-ls-violet-dark"
          >
            Continuer
          </Button>
        </form>
      )}

      {step === 'recapitulatif' && (
        <div className="flex flex-col gap-6">
          <section className="rounded-ls-card border border-ls-gray-200 bg-ls-white p-4">
            <h2 className="text-ls-h2 text-ls-gray-900">Récapitulatif</h2>
            <ul className="mt-3 flex flex-col gap-2 text-ls-body">
              {items.map((i) => {
                const label = variantLabel(i)
                return (
                  <li key={i.variantId} className="flex justify-between gap-2">
                    <span className="text-ls-gray-500">
                      {i.productName}
                      {label ? ` (${label})` : ''} ×{i.qty}
                    </span>
                    <span className="font-medium text-ls-gray-900">
                      {formatPrice(i.unitPrice * i.qty)}
                    </span>
                  </li>
                )
              })}
            </ul>
            <div className="mt-3 flex justify-between border-t border-ls-gray-200 pt-3 text-ls-body font-semibold text-ls-gray-900">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
            <p className="mt-2 text-ls-label text-ls-gray-500">
              Frais de livraison confirmés par le vendeur sur WhatsApp.
            </p>
          </section>

          <section className="rounded-ls-card border border-ls-gray-200 bg-ls-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-ls-h2 text-ls-gray-900">Livraison</h2>
              <button
                type="button"
                onClick={() => setStep('adresse')}
                className="text-ls-label text-ls-gray-900 underline hover:text-ls-gray-600"
              >
                Modifier
              </button>
            </div>
            <div className="mt-2 text-ls-body text-ls-gray-900">
              <p>{address.fullName}</p>
              <p className="text-ls-gray-500">{address.phone}</p>
              <p className="text-ls-gray-500">{address.city}</p>
              {address.directions && (
                <p className="text-ls-gray-500">{address.directions}</p>
              )}
            </div>
          </section>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-ls-label text-ls-gray-900">
              Mode de règlement souhaité
            </legend>
            {PAYMENT_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-3 rounded-ls-input border border-ls-gray-200 px-3 py-2.5 text-ls-body text-ls-gray-900"
              >
                <input
                  type="radio"
                  name="payment"
                  value={opt.value}
                  checked={paymentMethod === opt.value}
                  onChange={() => setPaymentMethod(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </fieldset>

          <p className="text-ls-label text-ls-gray-500">
            La commande est confirmée avec le vendeur sur WhatsApp. Aucun paiement en ligne.
          </p>

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="h-11 bg-ls-violet text-ls-white hover:bg-ls-violet-dark"
            >
              {loading ? 'Création…' : 'Valider ma commande'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep('adresse')}
              disabled={loading}
              className="h-11"
            >
              Retour à l&apos;adresse
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
