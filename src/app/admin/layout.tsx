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
    <div className="flex min-h-svh bg-ls-gray-100 text-ls-gray-900">
      <AdminSidebar />
      <main className="flex-1 overflow-x-auto p-6">{children}</main>
    </div>
  )
}
