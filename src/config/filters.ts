export type SortOption = "popular" | "recent" | "downloads" | "rating" | "all"
export type PriceFilter = "free" | "paid" | "all"
export type TimeFilter = "today" | "week" | "month" | "year" | "all"
export type RatingFilter = "5" | "4" | "3" | "2" | "1" | "all"

export interface FilterOption {
  id: string
  type: "sort" | "price" | "time" | "rating"
  label: string
  value: string
  stars?: number
  order: number
  isDefault: boolean
  isEnabled: boolean
}

export interface FilterOptions {
  sortOptions: FilterOption[]
  priceOptions: FilterOption[]
  timeOptions: FilterOption[]
  ratingOptions: FilterOption[]
}

export const getDefaultSort = () => "popular"
export const getDefaultPrice = () => "all"
export const getDefaultTime = () => "all"
export const getDefaultRating = () => "all"

export const getFilterOptions = async (): Promise<FilterOptions> => {
  try {
    const response = await fetch("/api/filters")
    if (!response.ok) {
      throw new Error("Failed to fetch filter options")
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error fetching filter options:", error)
    // Return default options if API call fails
    return {
      sortOptions: [
        { id: "1", type: "sort", label: "Popular", value: "popular", order: 1, isDefault: true, isEnabled: true },
        { id: "2", type: "sort", label: "Recent", value: "recent", order: 2, isDefault: false, isEnabled: true },
        { id: "3", type: "sort", label: "Downloads", value: "downloads", order: 3, isDefault: false, isEnabled: true },
        { id: "4", type: "sort", label: "Rating", value: "rating", order: 4, isDefault: false, isEnabled: true }
      ],
      priceOptions: [
        { id: "5", type: "price", label: "All", value: "all", order: 1, isDefault: true, isEnabled: true },
        { id: "6", type: "price", label: "Free", value: "free", order: 2, isDefault: false, isEnabled: true },
        { id: "7", type: "price", label: "Paid", value: "paid", order: 3, isDefault: false, isEnabled: true }
      ],
      timeOptions: [
        { id: "8", type: "time", label: "All Time", value: "all", order: 1, isDefault: true, isEnabled: true },
        { id: "9", type: "time", label: "Today", value: "today", order: 2, isDefault: false, isEnabled: true },
        { id: "10", type: "time", label: "This Week", value: "week", order: 3, isDefault: false, isEnabled: true },
        { id: "11", type: "time", label: "This Month", value: "month", order: 4, isDefault: false, isEnabled: true },
        { id: "12", type: "time", label: "This Year", value: "year", order: 5, isDefault: false, isEnabled: true }
      ],
      ratingOptions: [
        { id: "13", type: "rating", label: "All", value: "all", order: 1, isDefault: true, isEnabled: true },
        { id: "14", type: "rating", label: "& up", value: "5", stars: 5, order: 2, isDefault: false, isEnabled: true },
        { id: "15", type: "rating", label: "& up", value: "4", stars: 4, order: 3, isDefault: false, isEnabled: true },
        { id: "16", type: "rating", label: "& up", value: "3", stars: 3, order: 4, isDefault: false, isEnabled: true },
        { id: "17", type: "rating", label: "& up", value: "2", stars: 2, order: 5, isDefault: false, isEnabled: true },
        { id: "18", type: "rating", label: "& up", value: "1", stars: 1, order: 6, isDefault: false, isEnabled: true }
      ]
    }
  }
} 