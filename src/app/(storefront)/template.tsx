/**
 * Transition d'entrée à chaque navigation dans le groupe (storefront).
 * Fondu léger (+ 4px de translation) via tw-animate-css — pas de JS, pas de
 * View Transitions. Neutralisé sous prefers-reduced-motion (règle globale
 * design-system.css : transition-duration ~0).
 */
export default function StorefrontTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 duration-[var(--duration-ls-base)] ease-[var(--ease-ls-out)]">
      {children}
    </div>
  )
}
