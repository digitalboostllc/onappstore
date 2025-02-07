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

export async function GET() {
  try {
    const user = await getCurrentUser()
    console.log("User is admin:", user?.isAdmin)

    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Clean up any existing prepared statements
    await prisma.$executeRaw`DEALLOCATE ALL`

    // Get total count first
    const totalCount = await prisma.category.count()

    // Fetch categories in batches
    const categories = []
    for (let skip = 0; skip < totalCount; skip += BATCH_SIZE) {
      const batch = await prisma.category.findMany({
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
      categories.push(...batch)
    }

    return NextResponse.json(categories)
  } catch (error) {
    console.error("Error fetching categories:", error)
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    )
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

    // Clean up any existing prepared statements
    await prisma.$executeRaw`DEALLOCATE ALL`

    // Process categories in batches
    const categories = await fetchCategories(url)
    
    // Insert categories in batches
    for (let i = 0; i < categories.length; i += BATCH_SIZE) {
      const batch = categories.slice(i, i + BATCH_SIZE)
      await Promise.all(
        batch.map(category =>
          prisma.category.upsert({
            where: { macUpdateId: category.macUpdateId },
            update: category,
            create: category,
          })
        )
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error syncing categories:", error)
    return NextResponse.json(
      { error: "Failed to sync categories" },
      { status: 500 }
    )
  }
}

async function fetchCategories(url: string): Promise<Category[]> {
  // Implementation of category fetching logic
  // This should be implemented based on your specific needs
  return []
} 