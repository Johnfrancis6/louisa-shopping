import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { ArrowLeft } from 'lucide-react'
import { getProductAdmin, listProductMedia } from '@/lib/db/admin'
import { formatPrice } from '@/lib/utils/format'
import { MediaManager } from '@/components/admin/media-manager'
import { Panel, LoadingRows } from '@/components/admin/ui'

export default function AdminProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <div>
      <Link
        href="/admin/products"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ls-gray-500 hover:text-ls-violet-dark"
      >
        <ArrowLeft size={15} />
        Catalogue
      </Link>
      <Suspense fallback={<LoadingRows />}>
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
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-semibold text-ls-gray-900 sm:text-xl">{product.name}</h1>
        <p className="mt-1 text-sm text-ls-gray-500">
          {product.slug} · {product.categoryName ?? '—'} · {formatPrice(product.basePrice)}
          {product.isActive ? '' : ' · inactif'}
        </p>
      </div>

      <Panel>
        <p className="mb-4 text-sm font-semibold text-ls-gray-900">Images</p>
        <MediaManager productId={id} images={images} />
      </Panel>
    </div>
  )
}
