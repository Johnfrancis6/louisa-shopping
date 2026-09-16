/**
 * Transition d'entrée à chaque navigation dans le groupe (storefront).
 * Translation de 4px via tw-animate-css — pas de JS, pas de View Transitions.
 * Neutralisée sous prefers-reduced-motion (règle globale design-system.css :
 * transition-duration ~0).
 *
 * ⚠️ PAS de `fade-in`. Il pose `--tw-enter-opacity: 0`, donc TOUTE page
 * commençait son premier rendu invisible. Or un élément à `opacity: 0` n'est
 * pas un « contentful paint » : le LCP de chaque page était repoussé de la
 * durée de l'animation, et sur /catalogue le LCP est justement le `<h1>`, qui
 * n'attend rien d'autre. C'est aussi ce qu'interdit la règle « visible au
 * repos » de docs/design/motion.md. La translation, elle, ne bloque pas le
 * LCP : un élément transformé compte comme peint.
 */
export default function StorefrontTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="animate-in slide-in-from-bottom-1 duration-[var(--duration-ls-base)] ease-[var(--ease-ls-out)]">
      {children}
    </div>
  )
}
