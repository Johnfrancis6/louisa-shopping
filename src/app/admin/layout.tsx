export const instant = false

import { redirect } from 'next/navigation'
import { getAdminUserId } from '@/lib/auth-guards'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export const metadata = { title: 'Admin — Louisa Shopping' }

/**
 * Layout admin. Le middleware (proxy.ts) redirige déjà les non-connectés ;
 * ici on vérifie le RÔLE admin en base (source de vérité). Chaque Server
 * Action admin re-vérifie de son côté (défense en profondeur).
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const adminId = await getAdminUserId()
  if (!adminId) redirect('/connexion?next=/admin/orders')

  return (
    <div className="min-h-svh bg-ls-gray-100 text-ls-gray-900 md:flex">
      <AdminSidebar />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  )
}
