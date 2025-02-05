'use server'

import { createCategory, updateCategory, deleteCategory } from "@/lib/categories"
import { revalidatePath } from "next/cache"
import { previewCategorySync, syncCategories, type CategoryChange } from "@/lib/sync-categories"

interface CategoryFormData {
  name: string
  parentId?: string
  iconName?: string
  description?: string
}

interface SyncOptions {
  preview?: boolean
  appUrl?: string
}

export async function handleCreateCategory(data: CategoryFormData) {
  try {
    await createCategory({
      name: data.name,
      parentId: data.parentId,
      icon: data.iconName,
      description: data.description
    })
    revalidatePath('/admin/categories')
    return { success: true }
  } catch (error) {
    console.error("Error creating category:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to create category" 
    }
  }
}

export async function handleUpdateCategory(id: string, data: CategoryFormData) {
  try {
    await updateCategory(id, {
      name: data.name,
      parentId: data.parentId,
      icon: data.iconName,
      description: data.description
    })
    revalidatePath('/admin/categories')
    return { success: true }
  } catch (error) {
    console.error("Error updating category:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to update category" 
    }
  }
}

export async function handleDeleteCategory(id: string) {
  try {
    await deleteCategory(id)
    revalidatePath('/admin/categories')
    return { success: true }
  } catch (error) {
    console.error("Error deleting category:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to delete category" 
    }
  }
}

export interface MacUpdateCategory {
  id: number
  parent_id: number | null
  slug: string
  name: string
  description: string | null
  url: string
  children?: MacUpdateCategory[]
}

interface SyncResult {
  success: boolean
  preview: {
    changes: CategoryChange[]
    summary: {
      create: number
      update: number
      unchanged: number
    }
  }
  changes?: CategoryChange[]
  summary?: {
    create: number
    update: number
    unchanged: number
  }
  error?: string
}

export async function handleSyncMacUpdateCategories(options: SyncOptions = {}) {
  const { preview = false, appUrl } = options

  if (!appUrl) {
    return {
      success: false,
      preview: {
        changes: [],
        summary: { create: 0, update: 0, unchanged: 0 }
      },
      error: "MacUpdate app URL is required"
    }
  }

  try {
    if (preview) {
      // Only get preview in preview mode
      const previewResult = await previewCategorySync(appUrl)
      return {
        success: true,
        preview: previewResult
      }
    }

    // Perform the actual sync
    const result = await syncCategories(appUrl)
    
    // Revalidate the categories page
    revalidatePath("/admin/categories")
    revalidatePath("/")

    return {
      success: true,
      changes: result.changes,
      summary: result.summary,
      preview: {
        changes: result.changes,
        summary: result.summary
      }
    }
  } catch (error) {
    console.error("Error syncing categories:", error)
    return {
      success: false,
      preview: {
        changes: [],
        summary: { create: 0, update: 0, unchanged: 0 }
      },
      error: error instanceof Error ? error.message : "Unknown error occurred"
    }
  }
} 