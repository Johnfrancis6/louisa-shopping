import Link from 'next/link'

/**
 * Gabarit des pages légales (mentions légales / CGV / confidentialité).
 * Contenu = brouillon à faire valider — les faits durs restent `[À COMPLÉTER]`.
 * Remplacer par le texte définitif fourni par le marchand avant mise en ligne.
 */
export function LegalPage({
  title,
  updated,
  sections,
}: {
  title: string
  updated: string
  sections: { heading: string; body: string }[]
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 md:px-6">
      <span className="mb-3 block h-[3px] w-8 rounded-full bg-ls-violet" aria-hidden />
      <h1 className="text-ls-h1 text-ls-gray-900">{title}</h1>
      <p className="mt-1 text-ls-label text-ls-gray-500">
        Dernière mise à jour : {updated}
      </p>

      <div className="mt-6 rounded-ls-md border border-ls-warning/30 bg-ls-warning-bg px-4 py-3 text-ls-label text-ls-warning">
        Document en cours de rédaction. Pour toute question, contactez-nous sur
        WhatsApp au +226 60 55 44 00.
      </div>

      <div className="mt-8 flex flex-col gap-6">
        {sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-ls-h2 text-ls-gray-900">{s.heading}</h2>
            <p className="mt-2 whitespace-pre-line text-ls-body text-ls-gray-600">
              {s.body}
            </p>
          </section>
        ))}
      </div>

      <Link
        href="/"
        className="mt-10 inline-block text-ls-label font-medium text-ls-violet-dark hover:text-ls-violet"
      >
        ← Retour à l&apos;accueil
      </Link>
    </div>
  )
}
