'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { signIn } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/compte'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await signIn.email({ email, password })
    setLoading(false)
    if (error) {
      toast.error(error.message ?? 'Identifiants incorrects.')
      return
    }
    router.replace(next)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-ls-label text-ls-gray-900">E-mail</span>
        <Input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-ls-label text-ls-gray-900">Mot de passe</span>
        <Input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>

      <Button
        type="submit"
        disabled={loading}
        className="h-11 bg-ls-violet text-ls-white hover:bg-ls-violet-dark"
      >
        {loading ? 'Connexion…' : 'Se connecter'}
      </Button>

      <p className="text-ls-label text-ls-gray-500">
        Pas encore de compte ?{' '}
        <Link
          href={`/inscription${next !== '/compte' ? `?next=${encodeURIComponent(next)}` : ''}`}
          className="text-ls-gray-900 underline hover:text-ls-gray-600"
        >
          Créer un compte
        </Link>
      </p>
    </form>
  )
}
