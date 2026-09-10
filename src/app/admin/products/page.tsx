import { Suspense } from 'react'
import Link from 'next/link'
import { connection } from 'next/server'
import { ImageIcon } from 'lucide-react'
import { listProductsAdmin, listCategoriesAdmin } from '@/lib/db/admin'
import { formatPrice } from '@/lib/utils/format'
import {
  ProductCreateForm,
  ProductActiveToggle,
  VariantCreateForm,
} from '@/components/admin/products-admin'
import { PageHeader, Panel, Card, CardList, EmptyState, LoadingRows } from '@/components/admin/ui'

export default function AdminProductsPage() {
  return (
    <div>
      <PageHeader
        title="Catalogue"
        description="Créer un produit, activer/désactiver, ajouter des variantes. Le stock se gère dans l'onglet Stock."
      />
      <Suspense fallback={<LoadingRows />}>
        <ProductsSection />
      </Suspense>
    </div>
  )
}

async function ProductsSection() {
  await connection()
  let products: Awaited<ReturnType<typeof listProductsAdmin>> = []
  let categories: Awaited<ReturnType<typeof listCategoriesAdmin>> = []
  try {
    ;[products, categories] = await Promise.all([listProductsAdmin(), listCategoriesAdmin()])
  } catch (err) {
    console.error('[admin/products]', err)
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel>
        <p className="mb-3 text-sm font-semibold text-ls-gray-900">Nouveau produit</p>
        <ProductCreateForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
      </Panel>

      {products.length === 0 ? (
        <EmptyState>Aucun produit.</EmptyState>
      ) : (
        <CardList cols={2}>
          {products.map((p) => (
            <Card key={p.id} className="gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/admin/products/${p.id}`}
                    className="font-semibold text-ls-gray-900 hover:text-ls-violet-dark"
                  >
                    {p.name}
                  </Link>
                  <p className="text-xs text-ls-gray-500">
                    {p.slug} · {p.categoryName ?? '—'}
                  </p>
                </div>
                <ProductActiveToggle id={p.id} isActive={p.isActive} />
              </div>

              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-ls-gray-900">{formatPrice(p.basePrice)}</span>
                <Link
                  href={`/admin/products/${p.id}`}
                  className="inline-flex items-center gap-1.5 text-ls-gray-500 hover:text-ls-violet-dark"
                >
                  <ImageIcon size={15} />
                  Images
                </Link>
              </div>

              <div className="border-t border-ls-gray-100 pt-3">
                <VariantCreateForm productId={p.id} />
              </div>
            </Card>
          ))}
        </CardList>
      )}
    </div>
  )
}
