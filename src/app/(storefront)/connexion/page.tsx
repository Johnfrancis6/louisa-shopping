export const instant = false

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getUserId } from '@/lib/auth-guards'
import { LoginForm } from '@/components/storefront/auth/login-form'

export const metadata = { title: 'Connexion — Louisa Shopping' }

export default async function ConnexionPage() {
  if (await getUserId()) redirect('/compte')

  return (
    <div className="mx-auto max-w-sm px-4 py-10">
      <h1 className="text-ls-h1 text-ls-gray-900">Connexion</h1>
      <p className="mt-1 mb-6 text-ls-body text-ls-gray-500">
        Accédez à vos commandes et à votre profil.
      </p>
      <Suspense fallback={<div className="ls-skeleton h-64 rounded-ls-card" />}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
