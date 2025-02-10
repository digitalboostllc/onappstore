import { prisma } from "@/lib/prisma"
import { cache } from "react"

export interface CategoryWithStats {
  id: string
  name: string
  description: string | null
  icon: string | null
  parentId: string | null
  appCount: number
  subcategories: CategoryWithStats[]
}

// Cache categories for 5 minutes
const CACHE_TIME = 5 * 60 * 1000 // 5 minutes

// In-memory cache for categories
let categoriesCache: {
  data: CategoryWithStats[] | null
  timestamp: number
} = {
  data: null,
  timestamp: 0
}

// Helper to check if cache is valid
function isCacheValid() {
  return (
    categoriesCache.data &&
    Date.now() - categoriesCache.timestamp < CACHE_TIME
  )
}

export const getCategories = cache(async (): Promise<CategoryWithStats[]> => {
  try {
    // Check in-memory cache first
    if (isCacheValid()) {
      return categoriesCache.data!
    }

    // Get all categories with optimized query
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        iconName: true,
        parentId: true,
        _count: {
          select: {
            apps: true,
            subApps: true
          }
        },
        children: {
          select: {
            id: true,
            name: true,
            description: true,
            iconName: true,
            parentId: true,
            _count: {
              select: {
                apps: true,
                subApps: true
              }
            }
          }
        }
      }
    })

    // Transform the data
    const transformed = categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      icon: cat.iconName,
      parentId: cat.parentId,
      appCount: cat._count.apps + cat._count.subApps,
      subcategories: cat.children.map(child => ({
        id: child.id,
        name: child.name,
        description: child.description,
        icon: child.iconName,
        parentId: child.parentId,
        appCount: child._count.apps + child._count.subApps,
        subcategories: []
      }))
    }))

    // Update cache
    categoriesCache = {
      data: transformed,
      timestamp: Date.now()
    }

    return transformed
  } catch (error) {
    console.error("Error fetching categories:", error)
    return []
  }
})

// Cache individual category lookups
const categoryCache = new Map<string, {
  data: CategoryWithStats | null
  timestamp: number
}>()

export const getCategoryById = cache(async (id: string): Promise<CategoryWithStats | null> => {
  try {
    // Check cache first
    const cached = categoryCache.get(id)
    if (cached && Date.now() - cached.timestamp < CACHE_TIME) {
      return cached.data
    }

    const category = await prisma.category.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        iconName: true,
        parentId: true,
        _count: {
          select: {
            apps: true,
            subApps: true
          }
        },
        children: {
          select: {
            id: true,
            name: true,
            description: true,
            iconName: true,
            parentId: true,
            _count: {
              select: {
                apps: true,
                subApps: true
              }
            }
          }
        }
      }
    })

    if (!category) {
      categoryCache.set(id, { data: null, timestamp: Date.now() })
      return null
    }

    const transformed = {
      id: category.id,
      name: category.name,
      description: category.description,
      icon: category.iconName,
      parentId: category.parentId,
      appCount: category._count.apps + category._count.subApps,
      subcategories: category.children.map(child => ({
        id: child.id,
        name: child.name,
        description: child.description,
        icon: child.iconName,
        parentId: child.parentId,
        appCount: child._count.apps + child._count.subApps,
        subcategories: []
      }))
    }

    // Update cache
    categoryCache.set(id, {
      data: transformed,
      timestamp: Date.now()
    })

    return transformed
  } catch (error) {
    console.error("Error fetching category:", error)
    return null
  }
})

// Optimized version with caching
export const getCategoriesWithStats = cache(async (): Promise<CategoryWithStats[]> => {
  // Reuse the cached categories if available
  return getCategories()
})

export async function createCategory(data: {
  name: string
  parentId?: string
  icon?: string
  description?: string
}) {
  return prisma.category.create({
    data: {
      name: data.name,
      parentId: data.parentId,
      iconName: data.icon,
      description: data.description
    },
    include: {
      parent: true,
      children: true
    }
  })
}

export async function updateCategory(id: string, data: {
  name?: string
  parentId?: string | null
  icon?: string | null
  description?: string | null
}) {
  return prisma.category.update({
    where: { id },
    data: {
      name: data.name,
      parentId: data.parentId,
      iconName: data.icon,
      description: data.description
    },
    include: {
      parent: true,
      children: true
    }
  })
}

export async function deleteCategory(id: string) {
  // First, update all apps in this category to remove the category reference
  await prisma.$transaction([
    // Update apps that use this category as main category
    prisma.app.updateMany({
      where: { categoryId: id },
      data: { 
        categoryId: undefined,
        subcategoryId: undefined
      }
    }),
    // Update apps that use this category as subcategory
    prisma.app.updateMany({
      where: { subcategoryId: id },
      data: { subcategoryId: undefined }
    }),
    // Delete the category
    prisma.category.delete({
      where: { id }
    })
  ])
} 