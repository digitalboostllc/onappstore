import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"

const BATCH_SIZE = 20 // Reduced batch size for serverless
const MAX_RETRIES = 2
const RETRY_DELAY = 100

interface Category {
  name: string
  macUpdateId: string
  parentId?: string | null
  description?: string | null
}

// Helper function to safely execute Prisma queries with retries
async function executePrismaQuery<T>(operation: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  try {
    // Clean up before operation
    await prisma.$executeRaw`DEALLOCATE ALL`
    return await operation()
  } catch (error) {
    if (retries > 0 && error instanceof Error) {
      // Retry on prepared statement errors or connection issues
      if (error.message.includes('42P05') || error.message.includes('Connection')) {
        console.warn(`Retrying operation, ${retries} attempts remaining`)
        await prisma.$executeRaw`DEALLOCATE ALL`
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
        return executePrismaQuery(operation, retries - 1)
      }
    }
    throw error
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get total count first with safe execution
    const totalCount = await executePrismaQuery(() => prisma.category.count())

    // Fetch categories in smaller batches
    const categories = []
    for (let skip = 0; skip < totalCount; skip += BATCH_SIZE) {
      const batch = await executePrismaQuery(() => 
        prisma.category.findMany({
          take: BATCH_SIZE,
          skip,
          select: {
            id: true,
            name: true,
            description: true,
            macUpdateId: true,
            parentId: true,
            parent: {
              select: {
                id: true,
                name: true
              }
            },
            children: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            name: 'asc',
          },
        })
      )
      categories.push(...batch)

      // Add a small delay between batches
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    return NextResponse.json(categories)
  } catch (error) {
    console.error("Error fetching categories:", error)
    return NextResponse.json(
      { 
        error: "Failed to fetch categories",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  } finally {
    try {
      await prisma.$executeRaw`DEALLOCATE ALL`
    } catch (cleanupError) {
      console.warn("Cleanup warning:", cleanupError)
    }
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { url } = await req.json()
    console.log("Fetching categories from URL:", url)

    // Process categories in batches
    const categories = await fetchCategories(url)
    
    // Insert categories in smaller batches
    const UPSERT_BATCH_SIZE = 5 // Even smaller batch size for upserts
    for (let i = 0; i < categories.length; i += UPSERT_BATCH_SIZE) {
      const batch = categories.slice(i, i + UPSERT_BATCH_SIZE)
      await executePrismaQuery(async () => {
        await Promise.all(
          batch.map(category =>
            prisma.category.upsert({
              where: { macUpdateId: category.macUpdateId },
              update: category,
              create: category,
            })
          )
        )
      })

      // Add a small delay between batches
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error syncing categories:", error)
    return NextResponse.json(
      { 
        error: "Failed to sync categories",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  } finally {
    try {
      await prisma.$executeRaw`DEALLOCATE ALL`
    } catch (cleanupError) {
      console.warn("Cleanup warning:", cleanupError)
    }
  }
}

async function fetchCategories(url: string): Promise<Category[]> {
  // Implementation of category fetching logic
  // This should be implemented based on your specific needs
  return []
} 