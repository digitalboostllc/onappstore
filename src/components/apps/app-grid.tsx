"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { AppCard } from "@/components/apps/app-card"
import { Button } from "@/components/ui/button"
import type { App } from "@/types/app"
import type { AppWithDetails } from "@/lib/services/app-service"
import { useState, useEffect } from "react"
import { Loader2, ChevronDown } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

interface AppGridProps {
  categoryId?: string
  subcategoryId?: string
  apps: AppWithDetails[]
  total: number
  pages: number
  currentPage: number
  showControls?: boolean
}

export function AppGrid({
  categoryId,
  subcategoryId,
  apps,
  total,
  pages,
  currentPage,
  showControls = false,
}: AppGridProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

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

  const handleSortChange = (value: string) => {
    router.push(
      `?${createQueryString({
        sort: value === "all" ? null : value,
      })}`,
      { scroll: false }
    )
  }

  if (apps.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No apps found in this category.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {showControls && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? 'app' : 'apps'} found
          </p>
          <Select
            defaultValue={searchParams.get("sort") || "recent"}
            onValueChange={handleSortChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="downloads">Most Downloads</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {apps.map((app) => (
          <AppCard key={app.id} app={app} />
        ))}
      </div>

      {pages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pages }).map((_, i) => {
            const pageNumber = i + 1
            return (
              <Button
                key={i}
                variant={pageNumber === currentPage ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  router.push(
                    `?${createQueryString({
                      page: pageNumber.toString(),
                    })}`,
                    { scroll: false }
                  )
                }}
              >
                {pageNumber}
              </Button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function AppGridSkeleton({ showControls = false }) {
  return (
    <div className="space-y-6">
      {showControls && (
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-10 w-[180px]" />
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card">
            <div className="p-6 space-y-4">
              <div className="space-y-3">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 