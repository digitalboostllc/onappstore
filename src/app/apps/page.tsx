import { Suspense } from "react"
import { AppFilters } from "@/components/apps/app-filters"
import { AppGrid, AppGridSkeleton } from "@/components/apps/app-grid"
import { getApps, getPopularTags } from "@/lib/services/app-service"
import { PageHeader } from "@/components/page-header"
import { getCategoriesWithStats } from "@/lib/categories"

type SearchParams = {
  search?: string
  categories?: string
  category?: string
  tags?: string
  sort?: "popular" | "recent" | "downloads" | "rating" | "all"
  price?: "free" | "paid" | "all"
  updated?: "today" | "week" | "month" | "year" | "all"
  rating?: "5" | "4" | "3" | "2" | "1" | "all"
  page?: string
}

export default async function AppsPage(props: any) {
  const searchParams = props.searchParams as SearchParams
  const { search, categories, category, tags, sort, price, updated, rating, page } = searchParams
  const currentPage = page ? parseInt(page) : 1

  const [{ apps, total, pages }, popularTags, categoriesList] = await Promise.all([
    getApps({
      search,
      categories: categories?.split(","),
      category,
      tags: tags?.split(","),
      sort,
      price,
      updated,
      rating,
      page: currentPage,
      published: true,
    }),
    getPopularTags(),
    getCategoriesWithStats()
  ])

  return (
    <div className="container py-8">
      <PageHeader>
        <PageHeader.Title>Apps</PageHeader.Title>
        <PageHeader.Description>
          Browse and discover amazing apps for your Mac.
        </PageHeader.Description>
      </PageHeader>

      <div className="mt-8 lg:grid lg:grid-cols-[240px_1fr] lg:gap-8">
        <aside className="hidden lg:block">
          <div className="sticky top-8">
            <Suspense fallback={<AppFilters categories={[]} tags={[]} totalApps={0} />}>
              <AppFilters 
                categories={categoriesList} 
                tags={popularTags.map(t => t.tag)} 
                totalApps={total}
              />
            </Suspense>
          </div>
        </aside>
        
        <main>
          <Suspense fallback={<AppGridSkeleton showControls />}>
            <AppGrid
              apps={apps}
              total={total}
              pages={pages}
              currentPage={currentPage}
              showControls
            />
          </Suspense>
        </main>
      </div>
    </div>
  )
} 