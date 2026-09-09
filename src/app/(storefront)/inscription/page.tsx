export const instant = false

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getUserId } from '@/lib/auth-guards'
import { SignupForm } from '@/components/storefront/auth/signup-form'

export const metadata = { title: 'Créer un compte — Louisa Shopping' }

export default async function InscriptionPage() {
  if (await getUserId()) redirect('/compte')

  return (
    <div className="mx-auto max-w-sm px-4 py-10">
      <h1 className="text-ls-h1 text-ls-gray-900">Créer un compte</h1>
      <p className="mt-1 mb-6 text-ls-body text-ls-gray-500">
        Le téléphone sert à confirmer vos commandes sur WhatsApp.
      </p>
      <Suspense fallback={<div className="ls-skeleton h-96 rounded-ls-card" />}>
        <SignupForm />
      </Suspense>
    </div>
  )
}
