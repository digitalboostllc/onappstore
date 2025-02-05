"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { CategoryWithStats } from "@/lib/categories"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { ChevronLeft, ChevronRight, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getDefaultSort,
  getDefaultPrice,
  getDefaultRating,
  type SortOption,
  type PriceFilter,
  type RatingFilter,
  type FilterOption,
  getFilterOptions,
} from "@/config/filters"
import { useEffect, useState, useRef } from "react"

interface CategoryFiltersProps {
  categories: CategoryWithStats[]
  selectedCategoryId?: string
  selectedSubcategoryId?: string
}

export function CategoryFilters({
  categories,
  selectedCategoryId,
  selectedSubcategoryId,
}: CategoryFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [filterOptions, setFilterOptions] = useState<{
    sortOptions: FilterOption[]
    priceOptions: FilterOption[]
    timeOptions: FilterOption[]
    ratingOptions: FilterOption[]
  } | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  useEffect(() => {
    const loadFilterOptions = async () => {
      const options = await getFilterOptions()
      setFilterOptions(options)
    }
    loadFilterOptions()
  }, [])
  
  const selectedCategory = selectedCategoryId
    ? categories.find((cat) => cat.id === selectedCategoryId)
    : null

  const createQueryString = (params: Record<string, string | null>) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()))
    
    Object.entries(params).forEach(([key, value]) => {
      if (!value) {
        current.delete(key)
      } else {
        current.set(key, value)
      }
    })

    return current.toString()
  }

  const handleCategoryChange = (value: string) => {
    router.push(
      `?${createQueryString({
        categoryId: value || null,
        subcategoryId: null,
      })}`,
      { scroll: false }
    )
  }

  const handleSubcategoryChange = (subcategoryId: string | null) => {
    router.push(
      `?${createQueryString({
        categoryId: selectedCategoryId || null,
        subcategoryId: subcategoryId,
      })}`,
      { scroll: false }
    )
  }

  const handleFilterChange = (key: string, value: string | null) => {
    router.push(
      `?${createQueryString({
        [key]: value,
      })}`,
      { scroll: false }
    )
  }

  const currentSort = (searchParams.get("sort") as SortOption) || getDefaultSort()
  const currentPrice = (searchParams.get("price") as PriceFilter) || getDefaultPrice()
  const currentRating = (searchParams.get("rating") as RatingFilter) || getDefaultRating()

  const checkScroll = () => {
    const container = scrollContainerRef.current
    if (!container) return

    setCanScrollLeft(container.scrollLeft > 0)
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth
    )
  }

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    checkScroll()
    container.addEventListener('scroll', checkScroll)
    window.addEventListener('resize', checkScroll)

    return () => {
      container.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [selectedCategory])

  useEffect(() => {
    if (selectedCategory) {
      // Wait for the next frame to ensure the DOM has updated
      requestAnimationFrame(() => {
        checkScroll()
      })
    }
  }, [selectedCategory, selectedCategory?.subcategories.length])

  const scrollSubcategories = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current
    if (!container) return

    const scrollAmount = container.clientWidth * 0.75 // Scroll 75% of the visible width
    const targetScroll = container.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount)
    
    container.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    })
  }

  if (!filterOptions) {
    return (
      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <Skeleton className="h-10 w-[200px]" />
        </div>
        <Separator />
        <div className="flex flex-wrap items-center gap-4">
          <Skeleton className="h-10 w-[140px]" />
          <Separator orientation="vertical" className="h-6" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-20" />
            ))}
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-24" />
            ))}
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <Select
          value={selectedCategoryId || ""}
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name} ({category.appCount})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedCategory && selectedCategory.subcategories.length > 0 && (
          <>
            <Separator orientation="vertical" className="h-6" />
            <div className="relative flex-1 min-w-0">
              {canScrollLeft && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-20 h-8 w-8 bg-background/80 backdrop-blur-sm shadow-sm"
                  onClick={() => scrollSubcategories('left')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              <div 
                className="overflow-auto px-8 no-scrollbar" 
                ref={scrollContainerRef}
                style={{ 
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                <div className="flex gap-2 min-w-max">
                  <Button
                    variant={selectedSubcategoryId ? "outline" : "secondary"}
                    size="sm"
                    onClick={() => handleSubcategoryChange(null)}
                    className="shrink-0"
                  >
                    All {selectedCategory.name}
                  </Button>
                  {selectedCategory.subcategories.map((subcategory) => (
                    <Button
                      key={subcategory.id}
                      variant={selectedSubcategoryId === subcategory.id ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => handleSubcategoryChange(subcategory.id)}
                      className="shrink-0"
                    >
                      {subcategory.name} ({subcategory.appCount})
                    </Button>
                  ))}
                </div>
              </div>
              {canScrollRight && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-20 h-8 w-8 bg-background/80 backdrop-blur-sm shadow-sm"
                  onClick={() => scrollSubcategories('right')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      <Separator />

      <div className="flex flex-wrap items-center gap-4">
        <Select
          value={currentSort}
          onValueChange={(value) => handleFilterChange("sort", value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {filterOptions.sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-6" />

        <div className="flex flex-wrap gap-2">
          {filterOptions.priceOptions.map((option) => (
            <Button
              key={option.value}
              variant={currentPrice === option.value ? "secondary" : "outline"}
              size="sm"
              onClick={() => handleFilterChange("price", option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        <Separator orientation="vertical" className="h-6" />

        <div className="flex flex-wrap gap-2">
          {filterOptions.ratingOptions.map((option) => (
            <Button
              key={option.value}
              variant={currentRating === option.value ? "secondary" : "outline"}
              size="sm"
              onClick={() => handleFilterChange("rating", option.value)}
            >
              {option.value === "all" ? (
                "All"
              ) : (
                <span className="flex items-center gap-0.5">
                  {Array.from({ length: option.stars || 0 }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-3.5 w-3.5 fill-current"
                    />
                  ))}
                </span>
              )}
            </Button>
          ))}
        </div>
      </div>
    </Card>
  )
} 