import { ExternalLink } from 'lucide-react'

/**
 * Rendue uniquement si `product.hasTutorial` ET `tutorialUrl` est renseigné.
 * Lien externe uniquement (pas d'embed) — décision prise avant conception.
 */
export function TutorialSection({
  hasTutorial,
  tutorialUrl,
}: {
  hasTutorial: boolean
  tutorialUrl: string | null
}) {
  if (!hasTutorial || !tutorialUrl) return null

  return (
    <section className="border-t border-ls-gray-200 px-4 py-6 md:px-12">
      <h2 className="text-ls-h2 text-ls-gray-900">Tutoriel de montage</h2>
      <a
        href={tutorialUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex h-11 w-fit items-center gap-2 rounded-ls-btn border border-ls-gray-200 px-4 text-ls-body text-ls-gray-900 hover:bg-ls-gray-50"
      >
        <ExternalLink className="h-4 w-4 text-ls-accent" />
        Ouvrir le tutoriel
      </a>
    </section>
  )
}