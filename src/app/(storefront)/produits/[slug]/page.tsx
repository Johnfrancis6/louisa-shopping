import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getProductBySlug } from '@/lib/data/products'
import { ProductPurchaseExperience } from '@/components/storefront/product/product-purchase-experience'
import { DeliveryZones } from '@/components/storefront/product/delivery-zones'
import { TutorialSection } from '@/components/storefront/product/tutorial-section'
import { ReviewsSection } from '@/components/storefront/product/reviews-section'

// Pages produit rendues à la demande (PPR) — pas de generateStaticParams :
// la liste des slugs vit en base, indisponible au build. `params` est lu dans
// un enfant sous <Suspense> pour garder un shell pré-rendu (squelette).

export default function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductContent params={params} />
    </Suspense>
  )
}

async function ProductContent({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const product = await getProductBySlug(slug)

  if (!product) notFound()

  return (
    <div>
      <ProductPurchaseExperience product={product} />
      <DeliveryZones zones={product.deliveryZones} />
      <TutorialSection hasTutorial={product.hasTutorial} tutorialUrl={product.tutorialUrl} />
      <ReviewsSection productId={product.id} />
    </div>
  )
}

function ProductSkeleton() {
  return (
    <div className="pb-28 md:pb-0">
      <div className="ls-skeleton aspect-square w-full" />
      <div className="flex flex-col gap-4 px-4 py-6 md:px-12">
        <div className="ls-skeleton h-7 w-3/4 rounded" />
        <div className="ls-skeleton h-4 w-1/3 rounded" />
        <div className="ls-skeleton h-6 w-1/4 rounded" />
        <div className="ls-skeleton mt-4 h-11 w-full rounded-ls-btn" />
      </div>
    </div>
  )
}
