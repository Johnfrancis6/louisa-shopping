'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'

export function SearchBox({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter()
  const params = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = q.trim()
    router.push(trimmed ? `/recherche?q=${encodeURIComponent(trimmed)}` : '/recherche')
  }

  return (
    <form onSubmit={submit} className="relative w-full">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ls-gray-400"
        size={18}
      />
      <input
        type="search"
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher un produit…"
        className="w-full rounded-ls-sm border border-ls-gray-200 bg-ls-gray-50 py-2 pl-10 pr-3 text-ls-body text-ls-gray-900 outline-none focus-visible:border-ls-violet focus-visible:ring-2 focus-visible:ring-ls-violet/30"
      />
    </form>
  )
}
