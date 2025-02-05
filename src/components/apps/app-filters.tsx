"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Star } from "lucide-react"
import { CategorySelect } from "./category-select"
import { CategoryWithStats } from "@/lib/categories"
import { Checkbox } from "@/components/ui/checkbox"
import {
  getDefaultSort,
  getDefaultPrice,
  getDefaultTime,
  getDefaultRating,
  type SortOption,
  type PriceFilter,
  type TimeFilter,
  type RatingFilter,
  type FilterOption,
  getFilterOptions,
} from "@/config/filters"
import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"

interface AppFiltersProps {
  categories: CategoryWithStats[]
  tags: string[]
  totalApps: number
}

export function AppFilters({ categories, tags, totalApps }: AppFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [filterOptions, setFilterOptions] = useState<{
    sortOptions: FilterOption[]
    priceOptions: FilterOption[]
    timeOptions: FilterOption[]
    ratingOptions: FilterOption[]
  } | null>(null)

  useEffect(() => {
    const loadFilterOptions = async () => {
      const options = await getFilterOptions()
      setFilterOptions(options)
    }
    loadFilterOptions()
  }, [])

  console.log('AppFilters rendering')
  console.log('Raw categories:', categories)

  const sort = (searchParams.get("sort") as SortOption) || getDefaultSort()
  const selectedCategories = searchParams.get("categories")?.split(",") || []
  const rating = (searchParams.get("rating") as RatingFilter) || getDefaultRating()
  const minDownloads = searchParams.get("minDownloads")
  const price = (searchParams.get("price") as PriceFilter) || getDefaultPrice()
  const updated = (searchParams.get("updated") as TimeFilter) || getDefaultTime()

  // Handle categories whether they're strings or objects
  const parentCategories = categories.map(cat => ({
    id: typeof cat === 'string' ? cat : cat.id,
    name: typeof cat === 'string' ? cat : cat.name,
    appCount: typeof cat === 'string' ? undefined : cat.appCount
  }))
  
  console.log('Processed parent categories:', parentCategories)
  console.log('Selected categories:', selectedCategories)

  const createQueryString = (params: Record<string, string | null>) => {
    const newSearchParams = new URLSearchParams(searchParams.toString())

    for (const [key, value] of Object.entries(params)) {
      if (value === null) {
        newSearchParams.delete(key)
      } else {
        newSearchParams.set(key, value)
      }
    }

    return newSearchParams.toString()
  }

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    const newCategories = checked
      ? [...selectedCategories, categoryId]
      : selectedCategories.filter(id => id !== categoryId)

    router.push(
      `?${createQueryString({
        categories: newCategories.length > 0 ? newCategories.join(",") : null,
      })}`,
      { scroll: false }
    )
  }

  if (!filterOptions) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border bg-card">
          <div className="p-6 space-y-6">
            {/* Updated section */}
            <div className="space-y-3">
              <Skeleton className="h-5 w-24" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>

            {/* Price section */}
            <div className="space-y-3">
              <Skeleton className="h-5 w-16" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>

            {/* Rating section */}
            <div className="space-y-3">
              <Skeleton className="h-5 w-20" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>

            {/* Categories section */}
            <div className="space-y-3">
              <Skeleton className="h-5 w-24" />
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const sections = [
    {
      id: "updated",
      title: "Updated",
      content: (
        <div className="space-y-3">
          {filterOptions.timeOptions.map((option) => {
            console.log('Rendering time option:', option.value)
            return (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`time-${option.value}`}
                  checked={updated === option.value}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      router.push(
                        `?${createQueryString({
                          updated: option.value === "all" ? null : option.value,
                        })}`,
                        { scroll: false }
                      )
                    }
                  }}
                />
                <label
                  htmlFor={`time-${option.value}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center justify-between flex-1"
                >
                  <span>{option.label}</span>
                </label>
              </div>
            )
          })}
        </div>
      ),
    },
    {
      id: "price",
      title: "Price",
      content: (
        <div className="space-y-3">
          {filterOptions.priceOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={option.value}
                checked={price === option.value}
                onCheckedChange={(checked) => {
                  if (checked) {
                    router.push(
                      `?${createQueryString({
                        price: option.value === "all" ? null : option.value,
                      })}`,
                      { scroll: false }
                    )
                  }
                }}
              />
              <label
                htmlFor={option.value}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center justify-between flex-1"
              >
                <span>{option.label}</span>
              </label>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "rating",
      title: "Rating",
      content: (
        <div className="space-y-3">
          {filterOptions.ratingOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`rating-${option.value}`}
                checked={rating === option.value}
                onCheckedChange={(checked) => {
                  if (checked) {
                    router.push(
                      `?${createQueryString({
                        rating: option.value === "all" ? null : option.value,
                      })}`,
                      { scroll: false }
                    )
                  }
                }}
              />
              <label
                htmlFor={`rating-${option.value}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1.5 flex-1"
              >
                {option.value === "all" ? (
                  <span>All</span>
                ) : (
                  <>
                    <div className="flex gap-0.5">
                      {Array.from({ length: option.stars || 0 }).map((_, i) => (
                        <Star
                          key={i}
                          className="h-4 w-4 fill-amber-400 text-amber-400"
                        />
                      ))}
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {option.label}
                    </span>
                  </>
                )}
              </label>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "categories",
      title: "Categories",
      content: (
        <div className="space-y-3">
          {parentCategories.map((category) => {
            console.log('Rendering category:', category)
            return (
              <div key={category.id} className="flex items-center space-x-2">
                <Checkbox
                  id={category.id}
                  checked={selectedCategories.includes(category.id)}
                  onCheckedChange={(checked) => 
                    handleCategoryChange(category.id, checked as boolean)
                  }
                />
                <label
                  htmlFor={category.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center justify-between flex-1"
                >
                  <span>{category.name}</span>
                  {category.appCount !== undefined && (
                    <span className="text-muted-foreground">{category.appCount}</span>
                  )}
                </label>
              </div>
            )
          })}
        </div>
      ),
    },
  ]

  console.log('Sections to render:', sections.map(s => s.id))

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card">
        <div className="p-6 space-y-4">
          {sections.map((section) => {
            console.log('Rendering section:', section.id)
            return (
              <div key={section.id} className="space-y-3">
                <h3 className="font-medium">{section.title}</h3>
                {section.content}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}