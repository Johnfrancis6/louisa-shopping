import { Suspense } from 'react'
import { Hero } from '@/components/storefront/home/hero'
import {
  CategoryShowcase,
  CategoryShowcaseSkeleton,
} from '@/components/storefront/home/category-showcase'
import {
  CatalogRailSection,
  ProcessSection,
  SavSection,
  NewsSection,
} from '@/components/storefront/home/home-sections'

/**
 * Home. `CategoryShowcase` ne lit que des helpers `'use cache'` → il fait
 * partie du shell statique (pas de <Suspense> : évite un skeleton mal
 * dimensionné et le décalage de mise en page quand les catégories arrivent).
 * Le <Suspense> reste en filet de sécurité si un jour la lecture devient
 * dynamique.
 */
export default function HomePage() {
  return (
    <>
      <Hero />

      <Suspense fallback={<CategoryShowcaseSkeleton />}>
        <CategoryShowcase />
      </Suspense>

      <CatalogRailSection />
      <ProcessSection />
      <SavSection />
      <NewsSection />
    </>
  )
}
