import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"

const BATCH_SIZE = 50 // Process categories in smaller batches

interface Category {
  name: string
  macUpdateId: string
  parentId?: string | null
  description?: string | null
}

// Helper function to safely execute Prisma queries
async function executePrismaQuery<T>(operation: () => Promise<T>): Promise<T> {
  try {
    // Clean up before operation
    await prisma.$executeRaw`DEALLOCATE ALL`
    return await operation()
  } catch (error) {
    if (error instanceof Error && error.message.includes('42P05')) {
      // If we get a prepared statement error, try one more time after cleanup
      await prisma.$executeRaw`DEALLOCATE ALL`
      return await operation()
    }
    throw error
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    console.log("User is admin:", user?.isAdmin)

    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get total count first with safe execution
    const totalCount = await executePrismaQuery(() => prisma.category.count())

    // Fetch categories in batches
    const categories = []
    for (let skip = 0; skip < totalCount; skip += BATCH_SIZE) {
      const batch = await executePrismaQuery(() => 
        prisma.category.findMany({
          take: BATCH_SIZE,
          skip,
          include: {
            parent: true,
            children: true,
          },
          orderBy: {
            name: 'asc',
          },
        })
      )
      categories.push(...batch)

      // Add a small delay between batches to prevent overloading
      await new Promise(resolve => setTimeout(resolve, 100))
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
    // Ensure cleanup after operation
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
    console.log("Token:", user)

    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { url } = await req.json()
    console.log("Fetching categories from URL:", url)

    // Process categories in batches
    const categories = await fetchCategories(url)
    
    // Insert categories in smaller batches
    const UPSERT_BATCH_SIZE = 10 // Smaller batch size for upserts
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
      await new Promise(resolve => setTimeout(resolve, 100))
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
    // Ensure cleanup after operation
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