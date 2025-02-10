import { prisma } from "@/lib/prisma"
import { cache } from "react"

// Cache duration (5 minutes)
const CACHE_TIME = 5 * 60 * 1000

// Cache for filter options by type
const filterOptionsCache = new Map<string, {
  data: FilterOption[] | null
  timestamp: number
}>()

// Helper to check if cache is valid
function isCacheValid(timestamp: number) {
  return Date.now() - timestamp < CACHE_TIME
}

export interface FilterOption {
  id: string
  type: string
  label: string
  value: string
  stars?: number | null
  order: number
  isDefault: boolean
  isEnabled: boolean
}

export const filterService = {
  getFilterOptions: cache(async (type: string): Promise<FilterOption[]> => {
    // Check cache first
    const cached = filterOptionsCache.get(type)
    if (cached && isCacheValid(cached.timestamp)) {
      return cached.data || []
    }

    try {
      const options = await prisma.filterOption.findMany({
        where: {
          type,
          isEnabled: true
        },
        orderBy: [
          { order: 'asc' },
          { label: 'asc' }
        ]
      })

      // Update cache
      filterOptionsCache.set(type, {
        data: options,
        timestamp: Date.now()
      })

      return options
    } catch (error) {
      console.error("[GET_FILTER_OPTIONS]", error)
      return []
    }
  }),

  getAllFilterOptions: cache(async (): Promise<Record<string, FilterOption[]>> => {
    try {
      const options = await prisma.filterOption.findMany({
        where: {
          isEnabled: true
        },
        orderBy: [
          { type: 'asc' },
          { order: 'asc' },
          { label: 'asc' }
        ]
      })

      // Group by type
      const grouped = options.reduce((acc, option) => {
        if (!acc[option.type]) {
          acc[option.type] = []
        }
        acc[option.type].push(option)
        return acc
      }, {} as Record<string, FilterOption[]>)

      // Update cache for each type
      Object.entries(grouped).forEach(([type, options]) => {
        filterOptionsCache.set(type, {
          data: options,
          timestamp: Date.now()
        })
      })

      return grouped
    } catch (error) {
      console.error("[GET_ALL_FILTER_OPTIONS]", error)
      return {}
    }
  }),

  getDefaultOptions: cache(async (type: string): Promise<FilterOption[]> => {
    try {
      const options = await prisma.filterOption.findMany({
        where: {
          type,
          isEnabled: true,
          isDefault: true
        },
        orderBy: [
          { order: 'asc' },
          { label: 'asc' }
        ]
      })

      return options
    } catch (error) {
      console.error("[GET_DEFAULT_FILTER_OPTIONS]", error)
      return []
    }
  }),

  // Cache invalidation methods
  invalidateFilterOptions(type: string) {
    filterOptionsCache.delete(type)
  },

  invalidateAllFilterOptions() {
    filterOptionsCache.clear()
  }
} 