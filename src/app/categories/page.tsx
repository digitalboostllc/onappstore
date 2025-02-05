import { Suspense } from "react"
import { Metadata } from "next"
import { getCategoriesWithStats } from "@/lib/categories"
import { getFilteredApps } from "@/lib/apps"
import { CategoryFilters } from "@/components/apps/category-filters"
import { AppGrid } from "@/components/apps/app-grid"

export const metadata: Metadata = {
  title: "Categories",
  description: "Browse apps by category",
}

interface PageProps {
  searchParams: Promise<{
    categoryId?: string
    subcategoryId?: string
    page?: string
    sort?: string
    price?: string
    rating?: string
  }>
}

export default async function CategoriesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const categories = await getCategoriesWithStats()
  const page = Number(params.page) || 1
  const { apps, total, pages } = await getFilteredApps({
    categoryId: params.categoryId,
    subcategoryId: params.subcategoryId,
    sort: params.sort,
    price: params.price,
    rating: params.rating,
    page,
  })

  return (
    <div className="container py-8 space-y-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold">Categories</h1>
        <p className="text-muted-foreground">
          Browse and discover apps by category
        </p>
      </div>

      <Suspense>
        <CategoryFilters
          categories={categories}
          selectedCategoryId={params.categoryId}
          selectedSubcategoryId={params.subcategoryId}
        />
      </Suspense>

      <AppGrid
        apps={apps}
        total={total}
        pages={pages}
        currentPage={page}
        categoryId={params.categoryId}
        subcategoryId={params.subcategoryId}
      />
    </div>
  )
} 