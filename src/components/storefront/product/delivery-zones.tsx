import { Truck } from 'lucide-react'
import { formatPrice } from '@/lib/utils/format'
import type { DeliveryZone } from '@/types/catalog'

export function DeliveryZones({ zones }: { zones: DeliveryZone[] }) {
  if (zones.length === 0) return null

  return (
    <section className="border-t border-ls-gray-200 px-4 py-6 md:px-12">
      <h2 className="flex items-center gap-2 text-ls-h2 text-ls-gray-900">
        <Truck className="h-5 w-5 text-ls-gray-500" />
        Livraison
      </h2>
      <ul className="mt-4 flex flex-col gap-3">
        {zones.map((zone) => (
          <li
            key={zone.zone_id ?? zone.zone_label}
            className="flex items-center justify-between text-ls-body text-ls-gray-900"
          >
            <span>{zone.zone_label}</span>
            <span className="text-ls-gray-500">
              {zone.frais > 0 ? formatPrice(zone.frais) : 'Sur devis'} ·{' '}
              {zone.delai_jours_min}-{zone.delai_jours_max} j
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}