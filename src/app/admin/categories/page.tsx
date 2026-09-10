import { Suspense } from 'react'
import { connection } from 'next/server'
import { listCategoriesAdmin } from '@/lib/db/admin'
import { CategoryCreateForm, CategoryRow } from '@/components/admin/categories-admin'
import { PageHeader, Panel, CardList, EmptyState, LoadingRows } from '@/components/admin/ui'

export default function AdminCategoriesPage() {
  return (
    <div>
      <PageHeader
        title="Catégories"
        description="La couleur de fond doit passer le contraste WCAG AA (vérifié à l'enregistrement)."
      />
      <div className="flex flex-col gap-5">
        <Panel>
          <p className="mb-3 text-sm font-semibold text-ls-gray-900">Nouvelle catégorie</p>
          <CategoryCreateForm />
        </Panel>

        <Suspense fallback={<LoadingRows />}>
          <CategoriesList />
        </Suspense>
      </div>
    </div>
  )
}

async function CategoriesList() {
  await connection()
  let rows: Awaited<ReturnType<typeof listCategoriesAdmin>> = []
  try {
    rows = await listCategoriesAdmin()
  } catch (err) {
    console.error('[admin/categories]', err)
  }

  if (rows.length === 0) return <EmptyState>Aucune catégorie.</EmptyState>

  return (
    <CardList cols={2}>
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
    </CardList>
  )
}
