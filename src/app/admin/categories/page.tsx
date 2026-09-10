import { Suspense } from 'react'
import { connection } from 'next/server'
import { listCategoriesAdmin } from '@/lib/db/admin'
import { CategoryCreateForm, CategoryRow } from '@/components/admin/categories-admin'

export default function AdminCategoriesPage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Catégories</h1>
      <div className="mb-6">
        <CategoryCreateForm />
      </div>
      <Suspense fallback={<p className="text-sm text-ls-gray-500">Chargement…</p>}>
        <CategoriesTable />
      </Suspense>
    </div>
  )
}

async function CategoriesTable() {
  await connection()
  let rows: Awaited<ReturnType<typeof listCategoriesAdmin>> = []
  try {
    rows = await listCategoriesAdmin()
  } catch (err) {
    console.error('[admin/categories]', err)
  }

  return (
    <div className="overflow-x-auto rounded border border-ls-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-ls-gray-200 bg-ls-gray-50 text-left text-xs uppercase text-ls-gray-500">
          <tr>
            <th className="px-3 py-2">Fond</th>
            <th className="px-3 py-2">Nom</th>
            <th className="px-3 py-2">Slug</th>
            <th className="px-3 py-2">Position</th>
            <th className="px-3 py-2">Visibilité</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="px-3 py-8 text-center text-ls-gray-400">
                Aucune catégorie.
              </td>
            </tr>
          )}
          {rows.map((c) => (
            <CategoryRow
              key={c.id}
              row={{
                id: c.id,
                slug: c.slug,
                name: c.name,
                bgColor: c.bgColor,
                position: c.position,
                visible: c.visible,
              }}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
