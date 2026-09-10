import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { getProductAdmin, listProductMedia } from '@/lib/db/admin'
import { formatPrice } from '@/lib/utils/format'
import { MediaManager } from '@/components/admin/media-manager'

export default function AdminProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <div className="max-w-3xl">
      <Link href="/admin/products" className="text-sm text-ls-gray-500 hover:underline">
        ← Catalogue
      </Link>
      <Suspense fallback={<p className="mt-4 text-sm text-ls-gray-500">Chargement…</p>}>
        <ProductDetail params={params} />
      </Suspense>
    </div>
  )
}

async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  await connection()
  const { id } = await params

  const product = await getProductAdmin(id)
  if (!product) notFound()

  const images = await listProductMedia(id)

  return (
    <>
      <div className="mt-2 mb-6">
        <h1 className="text-xl font-semibold">{product.name}</h1>
        <p className="text-xs text-ls-gray-500">
          {product.slug} · {product.categoryName ?? '—'} · {formatPrice(product.basePrice)}
          {product.isActive ? '' : ' · inactif'}
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ls-gray-500">
          Images
        </h2>
        <MediaManager productId={id} images={images} />
      </section>
    </>
  )
}
