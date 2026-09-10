'use client'

import Link from 'next/link'
import { LayoutDashboard } from 'lucide-react'
import { useSession } from '@/lib/auth-client'

/**
 * Raccourci vers le back-office — visible uniquement pour un compte `admin`.
 * Rendu client (lecture de session Better Auth) ; rien si non-admin.
 */
export function AdminNavLink({ className }: { className?: string }) {
  const { data } = useSession()
  if (data?.user?.role !== 'admin') return null

  return (
    <Link
      href="/admin"
      aria-label="Tableau de bord"
      className={
        className ??
        'hidden h-11 w-11 items-center justify-center rounded-ls-sm text-ls-violet-dark hover:bg-ls-violet-bg md:flex'
      }
    >
      <LayoutDashboard size={22} />
    </Link>
  )
}
