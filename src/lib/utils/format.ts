/**
 * Format imposé par le brief : "12 500 FCFA" (espace insécable milliers, symbole après).
 * Simplification assumée par rapport au commentaire de design-system.css (qui suggérait
 * Intl.NumberFormat en mode currencyDisplay:'name' + .replace(...) — plus fragile selon
 * la version d'ICU du runtime). Intl.NumberFormat('fr-FR') suffit pour le séparateur.
 */
export function formatPrice(amount: number): string {
  const formatted = new Intl.NumberFormat('fr-FR').format(Math.round(amount))
  return `${formatted} FCFA`
}