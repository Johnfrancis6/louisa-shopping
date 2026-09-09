import { Suspense } from 'react'
import { Hero } from '@/components/storefront/home/hero'
import {
  CategoryScroll,
  CategoryScrollSkeleton,
} from '@/components/storefront/home/category-scroll'
import { Reassurance } from '@/components/storefront/home/reassurance'

export default function HomePage() {
  return (
    <>
      <Hero />
      <div className="pt-[--spacing-ls-6]">
        <Suspense fallback={<CategoryScrollSkeleton />}>
          <CategoryScroll />
        </Suspense>
      </div>
      <Reassurance />
    </>
  )
}
