import { prisma } from "@/lib/prisma"
import { cache } from "react"

// Cache duration (1 minute for search results)
const CACHE_TIME = 60 * 1000

// Cache for search results
const searchCache = new Map<string, {
  data: any[]
  timestamp: number
}>()

// Helper to check if cache is valid
function isCacheValid(timestamp: number) {
  return Date.now() - timestamp < CACHE_TIME
}

// Helper to generate cache key
function getSearchCacheKey(query: string): string {
  return query.toLowerCase().trim()
}

export const searchService = {
  quickSearch: cache(async (query: string, limit: number = 5) => {
    // Check cache first
    const cacheKey = getSearchCacheKey(query)
    const cached = searchCache.get(cacheKey)
    if (cached && isCacheValid(cached.timestamp)) {
      return cached.data
    }

    try {
      const apps = await prisma.app.findMany({
        where: {
          AND: [
            {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } },
                { tags: { hasSome: [query] } }
              ]
            },
            { published: true }
          ]
        },
        select: {
          id: true,
          name: true,
          icon: true,
          shortDescription: true,
          category: {
            select: {
              id: true,
              name: true
            }
          },
          developer: {
            select: {
              id: true,
              companyName: true,
              user: {
                select: {
                  name: true
                }
              }
            }
          },
          _count: {
            select: {
              downloads: true,
              ratings: true
            }
          }
        },
        take: limit,
        orderBy: [
          { downloadCount: "desc" },
          { name: "asc" }
        ]
      })

      // Update cache
      searchCache.set(cacheKey, {
        data: apps,
        timestamp: Date.now()
      })

      return apps
    } catch (error) {
      console.error("[QUICK_SEARCH]", error)
      return []
    }
  }),

  // Cache invalidation method
  invalidateSearchCache() {
    searchCache.clear()
  }
} 