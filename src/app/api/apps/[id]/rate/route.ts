import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/utils"

export async function POST(
  request: NextRequest
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const pathParts = request.nextUrl.pathname.split('/')
    const appId = pathParts[pathParts.length - 2] // /api/apps/[id]/rate
    
    if (!appId) {
      return NextResponse.json({ error: "App ID not found" }, { status: 400 })
    }

    const data = await request.json()
    const { rating } = data

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 })
    }

    // Upsert the rating
    const updatedRating = await prisma.rating.upsert({
      where: {
        userId_appId: {
          userId: user.id,
          appId
        }
      },
      update: {
        rating
      },
      create: {
        rating,
        userId: user.id,
        appId
      }
    })

    // Get the average rating
    const averageRating = await prisma.rating.aggregate({
      where: {
        appId
      },
      _avg: {
        rating: true
      },
      _count: {
        rating: true
      }
    })

    return NextResponse.json({
      rating: updatedRating,
      averageRating: averageRating._avg.rating,
      totalRatings: averageRating._count.rating
    })
  } catch (error) {
    console.error("[RATE_APP] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to rate app" },
      { status: 500 }
    )
  }
} 