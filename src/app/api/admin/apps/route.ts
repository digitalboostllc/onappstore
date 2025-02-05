import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth/utils"

// Helper function to convert BigInt to Number and format dates
function convertBigIntToNumber(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return Number(obj);
  }
  
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToNumber);
  }
  
  if (typeof obj === 'object') {
    const converted: any = {};
    for (const key in obj) {
      converted[key] = convertBigIntToNumber(obj[key]);
    }
    return converted;
  }
  
  return obj;
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user?.isAdmin) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    console.log("Fetching admin apps...")
    console.log("Current user:", user.id, user.isAdmin)

    const apps = await prisma.app.findMany({
      include: {
        developer: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        subcategory: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            downloads: true,
            favorites: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Get average ratings using raw SQL
    const ratings = await prisma.$queryRaw`
      SELECT 
        "appId",
        ROUND(CAST(AVG(CAST("rating" AS FLOAT)) AS NUMERIC), 2)::float as "averageRating"
      FROM "Rating"
      GROUP BY "appId"
    ` as { appId: string; averageRating: number }[]

    // Create a map of app IDs to average ratings
    const ratingMap = new Map(
      ratings.map(r => [r.appId, Number(r.averageRating)])
    )

    // Combine apps with their average ratings and convert BigInts
    const appsWithRatings = convertBigIntToNumber(apps.map(app => ({
      ...app,
      averageRating: ratingMap.get(app.id) || 0,
    })))

    return NextResponse.json(appsWithRatings)
  } catch (error) {
    // Properly format the error for console.error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error("[ADMIN_APPS] Error:", { message: errorMessage, stack: error instanceof Error ? error.stack : undefined })
    return new NextResponse("Internal error", { status: 500 })
  }
} 