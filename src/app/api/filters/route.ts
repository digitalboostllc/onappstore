import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { FilterOption, FilterOptions } from "@/config/filters"

export async function GET() {
  try {
    const filterOptions = await prisma.filterOption.findMany({
      where: {
        isEnabled: true
      },
      orderBy: {
        order: 'asc'
      }
    })

    // Group options by type
    const initialValue: FilterOptions = {
      sortOptions: [],
      priceOptions: [],
      timeOptions: [],
      ratingOptions: []
    }

    const groupedOptions = filterOptions.reduce((acc: FilterOptions, option) => {
      // Ensure type is one of the valid types
      const type = option.type as FilterOption['type']
      if (!['sort', 'price', 'time', 'rating'].includes(type)) {
        return acc
      }

      const validOption: FilterOption = {
        ...option,
        type,
        stars: option.stars || undefined
      }

      switch (type) {
        case "sort":
          acc.sortOptions.push(validOption)
          break
        case "price":
          acc.priceOptions.push(validOption)
          break
        case "time":
          acc.timeOptions.push(validOption)
          break
        case "rating":
          acc.ratingOptions.push(validOption)
          break
      }
      return acc
    }, initialValue)

    return NextResponse.json(groupedOptions)
  } catch (error) {
    console.error("Error fetching filter options:", error)
    return NextResponse.json(
      { error: "Failed to fetch filter options" },
      { status: 500 }
    )
  }
} 