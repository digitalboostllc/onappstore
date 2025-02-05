"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type Category =
  | "PRODUCTIVITY"
  | "DEVELOPMENT"
  | "UTILITIES"
  | "GAMES"
  | "GRAPHICS"
  | "EDUCATION"
  | "ENTERTAINMENT"
  | "BUSINESS"
  | "LIFESTYLE"
  | "SOCIAL"
  | "OTHER"

interface AppFiltersProps {
  categories: Category[]
  tags: string[]
}

export function AppFilters({ categories, tags }: AppFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mounted, setMounted] = React.useState(false)

  const category = searchParams.get("category")
  const sort = searchParams.get("sort")
  const selectedTags = searchParams.get("tags")?.split(",") || []
  const search = searchParams.get("search") || ""
  const [rating, setRating] = React.useState(0)
  const [downloads, setDownloads] = React.useState(0)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const createQueryString = React.useCallback(
    (params: Record<string, string | string[] | null>) => {
      const current = new URLSearchParams(Array.from(searchParams.entries()))
      
      Object.entries(params).forEach(([key, value]) => {
        if (!value || (Array.isArray(value) && value.length === 0)) {
          current.delete(key)
        } else if (Array.isArray(value)) {
          current.set(key, value.join(","))
        } else {
          current.set(key, value)
        }
      })

      return current.toString()
    },
    [searchParams]
  )

  if (!mounted) {
    return null
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search apps..."
              defaultValue={search}
              className="pl-8"
              onChange={(e) => {
                const value = e.target.value
                router.push(
                  `?${createQueryString({
                    search: value || null,
                  })}`,
                  { scroll: false }
                )
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sort & Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Sort By</Label>
            <Select
              defaultValue={sort || "latest"}
              onValueChange={(value) => {
                router.push(
                  `?${createQueryString({
                    sort: value,
                  })}`,
                  { scroll: false }
                )
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={category || "all"}
              onValueChange={(value) => {
                router.push(
                  `?${createQueryString({
                    category: value === "all" ? null : value,
                  })}`,
                  { scroll: false }
                )
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0) + cat.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Minimum Rating</Label>
            <Slider
              min={0}
              max={5}
              step={0.5}
              value={[rating]}
              onValueChange={([value]) => {
                setRating(value)
                router.push(
                  `?${createQueryString({
                    minRating: value.toString(),
                  })}`,
                  { scroll: false }
                )
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Minimum Downloads</Label>
            <Input
              type="number"
              value={downloads}
              onChange={(e) => {
                const value = e.target.valueAsNumber
                setDownloads(value)
                router.push(
                  `?${createQueryString({
                    minDownloads: value.toString(),
                  })}`,
                  { scroll: false }
                )
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className={cn(
                  "cursor-pointer hover:bg-secondary",
                  selectedTags.includes(tag) &&
                    "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
                onClick={() => {
                  const newTags = selectedTags.includes(tag)
                    ? selectedTags.filter((t) => t !== tag)
                    : [...selectedTags, tag]
                  router.push(
                    `?${createQueryString({
                      tags: newTags,
                    })}`,
                    { scroll: false }
                  )
                }}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 