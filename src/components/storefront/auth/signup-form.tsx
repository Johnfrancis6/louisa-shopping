'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { signUp } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const PHONE_REGEX = /^\+?[0-9\s-]{8,20}$/

export function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/compte'

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [loading, setLoading] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!PHONE_REGEX.test(form.phone.trim())) {
      toast.error('Numéro de téléphone invalide.')
      return
    }
    if (form.password.length < 8) {
      toast.error('Le mot de passe doit faire au moins 8 caractères.')
      return
    }
    setLoading(true)
    const { error } = await signUp.email({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      phone: form.phone.trim(),
    })
    setLoading(false)
    if (error) {
      toast.error(error.message ?? 'Échec de la création du compte.')
      return
    }
    router.replace(next)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-ls-label text-ls-gray-900">Nom complet</span>
        <Input required autoComplete="name" value={form.name} onChange={set('name')} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-ls-label text-ls-gray-900">E-mail</span>
        <Input type="email" required autoComplete="email" value={form.email} onChange={set('email')} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-ls-label text-ls-gray-900">Téléphone (WhatsApp)</span>
        <Input
          type="tel"
          required
          autoComplete="tel"
          placeholder="+226 70 00 00 00"
          value={form.phone}
          onChange={set('phone')}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-ls-label text-ls-gray-900">Mot de passe</span>
        <Input
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          value={form.password}
          onChange={set('password')}
        />
      </label>

      <Button
        type="submit"
        disabled={loading}
        className="h-11 bg-ls-accent text-ls-white hover:bg-ls-accent-dark"
      >
        {loading ? 'Création…' : 'Créer mon compte'}
      </Button>

      <p className="text-ls-label text-ls-gray-500">
        Déjà un compte ?{' '}
        <Link
          href={`/connexion${next !== '/compte' ? `?next=${encodeURIComponent(next)}` : ''}`}
          className="text-ls-accent underline"
        >
          Se connecter
        </Link>
      </p>
    </form>
  )
}
