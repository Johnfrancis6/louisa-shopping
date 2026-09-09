'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'

export function SignOutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    await signOut()
    router.replace('/')
    router.refresh()
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={loading}
      onClick={handleClick}
      className="h-11"
    >
      {loading ? 'Déconnexion…' : 'Se déconnecter'}
    </Button>
  )
}
