'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createOrder } from '@/lib/actions/checkout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type PaymentMethod = 'mobile_money_orange' | 'mobile_money_moov' | 'cod'

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'cod', label: 'Paiement à la livraison' },
  { value: 'mobile_money_orange', label: 'Orange Money' },
  { value: 'mobile_money_moov', label: 'Moov Money' },
]

export function CheckoutForm({
  defaultName,
  defaultPhone,
}: {
  defaultName: string
  defaultPhone: string
}) {
  const router = useRouter()
  const [name, setName] = useState(defaultName)
  const [phone, setPhone] = useState(defaultPhone)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await createOrder({ name, phone, paymentMethod })
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-ls-label text-ls-gray-900">Nom complet</span>
        <Input required value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-ls-label text-ls-gray-900">Téléphone (WhatsApp)</span>
        <Input
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-ls-label text-ls-gray-900">Mode de règlement souhaité</legend>
        {PAYMENT_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className="flex items-center gap-3 rounded-[--radius-ls-input] border border-ls-gray-200 px-3 py-2.5 text-ls-body text-ls-gray-900"
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

      <Button
        type="submit"
        disabled={loading}
        className="h-11 bg-ls-accent text-ls-white hover:bg-ls-accent-dark"
      >
        {loading ? 'Création…' : 'Valider ma commande'}
      </Button>
    </form>
  )
}
