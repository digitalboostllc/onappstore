import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

interface MacUpdateCategory {
  id: number
  parent_id: number | null
  slug: string
  name: string
  description: string | null
  url: string
  children?: MacUpdateCategory[]
}

export interface CategoryChange {
  type: 'create' | 'update' | 'unchanged'
  name: string
  parentName?: string
  description?: string | null
  oldValues?: {
    name?: string
    description?: string | null
    parentId?: string | null
  }
}

function isValidMacUpdateUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url)
    return parsedUrl.hostname === 'www.macupdate.com' && 
           parsedUrl.pathname.startsWith('/app/mac/') &&
           !parsedUrl.pathname.endsWith('/app/mac/')
  } catch {
    return false
  }
}

function validateCategory(category: any): category is MacUpdateCategory {
  return (
    typeof category === 'object' &&
    category !== null &&
    typeof category.id === 'number' &&
    (category.parent_id === null || typeof category.parent_id === 'number') &&
    typeof category.name === 'string' &&
    typeof category.slug === 'string' &&
    (category.description === null || typeof category.description === 'string') &&
    typeof category.url === 'string' &&
    (!category.children || Array.isArray(category.children))
  )
}

function hasName(obj: unknown): obj is { name: unknown } {
  return typeof obj === 'object' && obj !== null && 'name' in obj
}

async function fetchMacUpdateCategories(appUrl: string): Promise<MacUpdateCategory[]> {
  try {
    // Validate URL
    if (!isValidMacUpdateUrl(appUrl)) {
      throw new Error('Invalid MacUpdate URL. Please provide a valid app URL (e.g., https://www.macupdate.com/app/mac/...)')
    }

    console.log('Fetching categories from URL:', appUrl)
    
    // Fetch categories data from the app page
    const response = await fetch(appUrl, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    if (!response.ok) {
      console.error('Failed to fetch:', response.status, response.statusText)
      throw new Error(`Failed to fetch categories: ${response.statusText}`)
    }

    const html = await response.text()
    console.log('Received HTML length:', html.length)
    
    // Find the JSON data in the HTML
    const startMarker = '<script id="__NEXT_DATA__" type="application/json">'
    const endMarker = '</script>'
    
    const startIndex = html.indexOf(startMarker)
    const endIndex = html.indexOf(endMarker, startIndex)
    
    console.log('Found Next.js data markers:', { startIndex, endIndex })
    
    if (startIndex === -1 || endIndex === -1) {
      console.error('Next.js data not found in HTML')
      console.log('HTML snippet:', html.slice(0, 500) + '...')
      throw new Error('Could not find Next.js data in the page')
    }

    const jsonData = html.slice(startIndex + startMarker.length, endIndex)
    console.log('Extracted JSON data length:', jsonData.length)

    const nextData = JSON.parse(jsonData)
    console.log('Parsed Next.js data structure:', {
      hasProps: !!nextData.props,
      hasPageProps: !!nextData.props?.pageProps,
      hasCategoriesData: !!nextData.props?.pageProps?.categoriesData,
      categoriesDataType: typeof nextData.props?.pageProps?.categoriesData
    })

    const categories = nextData.props?.pageProps?.categoriesData?.data
    console.log('Categories data:', {
      isArray: Array.isArray(categories),
      length: categories?.length,
      firstCategory: categories?.[0] ? {
        id: categories[0].id,
        name: categories[0].name,
        hasChildren: !!categories[0].children
      } : null
    })

    if (!Array.isArray(categories)) {
      console.error('Invalid categories structure:', categories)
      throw new Error('Invalid categories data structure')
    }

    // Validate each category
    const validCategories = categories.filter(validateCategory)
    console.log('Category validation:', {
      total: categories.length,
      valid: validCategories.length,
      invalid: categories.length - validCategories.length
    })

    if (validCategories.length === 0) {
      console.error('No valid categories found')
      throw new Error('No valid categories found in the response')
    }

    if (validCategories.length !== categories.length) {
      console.warn(`Warning: Some categories were invalid and were filtered out (${categories.length - validCategories.length} categories removed)`)
      console.log('Invalid categories:', categories.filter(c => !validateCategory(c)))
    }

    return validCategories
  } catch (error) {
    console.error('Error fetching MacUpdate categories:', error)
    throw error
  }
}

async function processCategory(
  category: MacUpdateCategory,
  parentId: string | null = null,
  existingCategories: any[],
  changes: CategoryChange[],
  tx: any,
  isPreview: boolean = false
) {
  if (!validateCategory(category)) {
    console.warn('Skipping invalid category')
    return
  }

  try {
    // Try to find existing category by macUpdateId first
    let existingCategory = await tx.category.findUnique({
      where: { macUpdateId: category.id.toString() }
    })

    // If not found by macUpdateId, try to find by name and parentId
    if (!existingCategory) {
      existingCategory = await tx.category.findFirst({
        where: {
          name: category.name,
          parentId: parentId
        }
      })
    }

    const parentCategory = parentId 
      ? existingCategories.find(cat => cat.id === parentId)
      : null

    // Create new category if it doesn't exist
    if (!existingCategory) {
      let newCategory = null
      if (!isPreview) {
        newCategory = await tx.category.create({
          data: {
            name: category.name,
            description: category.description || `Apps in the ${category.name} category`,
            parentId: parentId,
            macUpdateId: category.id.toString()
          }
        })
        console.log(`Created new category: ${category.name} (${newCategory.id})`)
      }
      
      changes.push({
        type: 'create',
        name: category.name,
        parentName: parentCategory?.name,
        description: category.description
      })

      // Process children if any
      if (category.children) {
        console.log(`Processing ${category.children.length} children for ${category.name}`)
        for (const child of category.children) {
          await processCategory(child, newCategory?.id || 'preview-id', existingCategories, changes, tx, isPreview)
        }
      }
    } else {
      // Check if category needs updating
      const needsUpdate = 
        existingCategory.description !== (category.description || `Apps in the ${category.name} category`) ||
        existingCategory.parentId !== parentId ||
        existingCategory.macUpdateId !== category.id.toString()

      if (needsUpdate) {
        if (!isPreview) {
          // Update existing category
          const updatedCategory = await tx.category.update({
            where: { id: existingCategory.id },
            data: {
              description: category.description || `Apps in the ${category.name} category`,
              parentId: parentId,
              macUpdateId: category.id.toString()
            }
          })
          console.log(`Updated category: ${category.name} (${updatedCategory.id})`)
        }

        changes.push({
          type: 'update',
          name: category.name,
          parentName: parentCategory?.name,
          description: category.description,
          oldValues: {
            description: existingCategory.description,
            parentId: existingCategory.parentId
          }
        })
      } else {
        console.log(`No changes needed for: ${category.name}`)
        changes.push({
          type: 'unchanged',
          name: category.name,
          parentName: parentCategory?.name
        })
      }

      // Process children if any
      if (category.children) {
        console.log(`Processing ${category.children.length} children for ${category.name}`)
        for (const child of category.children) {
          await processCategory(child, existingCategory.id, existingCategories, changes, tx, isPreview)
        }
      }
    }
  } catch (error) {
    console.error(`Error processing category ${category.name}:`, error)
    throw error
  }
}

export async function previewCategorySync(appUrl: string) {
  const changes: CategoryChange[] = []
  
  try {
    // Fetch the latest categories from MacUpdate
    const macUpdateCategories = await fetchMacUpdateCategories(appUrl)
    if (!macUpdateCategories || macUpdateCategories.length === 0) {
      throw new Error('No categories found to sync')
    }

    // Use a transaction that will be rolled back
    const result = await prisma.$transaction(async (tx) => {
      const existingCategories = await tx.category.findMany()
      
      // Process all root categories in preview mode
      for (const category of macUpdateCategories) {
        await processCategory(category, null, existingCategories, changes, tx, true)
      }

      // Rollback the transaction by throwing an error
      throw new Error('PREVIEW_ROLLBACK')
    }).catch((error: unknown) => {
      if (error instanceof Error && error.message !== 'PREVIEW_ROLLBACK') {
        throw error
      }
    })

    if (changes.length === 0) {
      throw new Error('No changes to apply')
    }

    return {
      changes,
      summary: {
        create: changes.filter(c => c.type === 'create').length,
        update: changes.filter(c => c.type === 'update').length,
        unchanged: changes.filter(c => c.type === 'unchanged').length
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'No changes to apply') {
      throw error
    }
    console.error('Error during preview:', error)
    throw error
  }
}

export async function syncCategories(appUrl: string) {
  const changes: CategoryChange[] = []
  const existingCategories = await prisma.category.findMany()
  
  try {
    // Fetch the latest categories from MacUpdate
    const macUpdateCategories = await fetchMacUpdateCategories(appUrl)
    if (!macUpdateCategories || macUpdateCategories.length === 0) {
      throw new Error('No categories found to sync')
    }

    // Process all root categories in sync mode
    for (const category of macUpdateCategories) {
      await processCategory(category, null, existingCategories, changes, prisma, false)
    }

    return {
      success: true,
      changes,
      summary: {
        create: changes.filter(c => c.type === 'create').length,
        update: changes.filter(c => c.type === 'update').length,
        unchanged: changes.filter(c => c.type === 'unchanged').length
      }
    }
  } catch (error) {
    console.error('Error during sync:', error)
    throw error
  }
} 