import { Suspense } from 'react'
import Link from 'next/link'
import { connection } from 'next/server'
import { listProductsAdmin, listCategoriesAdmin } from '@/lib/db/admin'
import { formatPrice } from '@/lib/utils/format'
import {
  ProductCreateForm,
  ProductActiveToggle,
  VariantCreateForm,
} from '@/components/admin/products-admin'

export default function AdminProductsPage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Catalogue</h1>
      <Suspense fallback={<p className="text-sm text-ls-gray-500">Chargement…</p>}>
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
    <>
      <div className="mb-6">
        <ProductCreateForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
      </div>

      <div className="overflow-x-auto rounded border border-ls-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-ls-gray-200 bg-ls-gray-50 text-left text-xs uppercase text-ls-gray-500">
            <tr>
              <th className="px-3 py-2">Nom</th>
              <th className="px-3 py-2">Catégorie</th>
              <th className="px-3 py-2">Prix base</th>
              <th className="px-3 py-2">État</th>
              <th className="px-3 py-2">Variantes</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-ls-gray-400">
                  Aucun produit.
                </td>
              </tr>
            )}
            {products.map((p) => (
              <tr key={p.id} className="border-b border-ls-gray-100 align-top last:border-0">
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/products/${p.id}`}
                    className="font-medium text-ls-gray-900 hover:underline"
                  >
                    {p.name}
                  </Link>
                  <div className="text-xs text-ls-gray-500">{p.slug}</div>
                  <Link
                    href={`/admin/products/${p.id}`}
                    className="text-xs text-ls-gray-500 hover:underline"
                  >
                    Gérer les images
                  </Link>
                </td>
                <td className="px-3 py-2 text-ls-gray-500">{p.categoryName ?? '—'}</td>
                <td className="px-3 py-2">{formatPrice(p.basePrice)}</td>
                <td className="px-3 py-2">
                  <ProductActiveToggle id={p.id} isActive={p.isActive} />
                </td>
                <td className="px-3 py-2">
                  <VariantCreateForm productId={p.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-ls-gray-500">
        Gestion du stock des variantes : onglet Stock.
      </p>
    </>
  )
}
