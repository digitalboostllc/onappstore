import { prisma } from "@/lib/db"

export interface CategoryWithStats {
  id: string
  name: string
  description: string | null
  icon: string | null
  parentId: string | null
  appCount: number
  subcategories: CategoryWithStats[]
}

export async function getCategories(): Promise<CategoryWithStats[]> {
  try {
    // Get all categories with their relationships and app counts
    const categories = await prisma.category.findMany({
      include: {
        parent: true,
        children: {
          include: {
            _count: {
              select: {
                apps: true,
                subApps: true
              }
            }
          }
        },
        _count: {
          select: {
            apps: true,
            subApps: true
          }
        }
      }
    })

    // Transform the data to include app counts
    return categories.map(cat => ({
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
  } catch (error) {
    console.error("Error fetching categories:", error)
    return []
  }
}

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

export async function getCategoryById(id: string): Promise<CategoryWithStats | null> {
  try {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: {
          include: {
            _count: {
              select: {
                apps: true,
                subApps: true
              }
            }
          }
        },
        _count: {
          select: {
            apps: true,
            subApps: true
          }
        }
      }
    })

    if (!category) return null

    return {
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
  } catch (error) {
    console.error("Error fetching category:", error)
    return null
  }
}

export async function getCategoriesWithStats(): Promise<CategoryWithStats[]> {
  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: {
          apps: true,
          subApps: true
        }
      }
    }
  })

  // Transform into CategoryWithStats and build tree structure
  const categoryMap = new Map<string, CategoryWithStats>()
  const rootCategories: CategoryWithStats[] = []

  // First pass: Create CategoryWithStats objects
  for (const category of categories) {
    categoryMap.set(category.id, {
      id: category.id,
      name: category.name,
      description: category.description,
      icon: category.iconName,
      parentId: category.parentId,
      appCount: category._count.apps + category._count.subApps,
      subcategories: []
    })
  }

  // Second pass: Build tree structure
  for (const category of categories) {
    const categoryWithStats = categoryMap.get(category.id)
    if (categoryWithStats && category.parentId) {
      const parent = categoryMap.get(category.parentId)
      if (parent) {
        parent.subcategories.push(categoryWithStats)
      }
    } else if (categoryWithStats) {
      rootCategories.push(categoryWithStats)
    }
  }

  return rootCategories
} 