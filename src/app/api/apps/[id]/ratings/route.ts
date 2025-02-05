import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/utils"

export async function GET(
  request: NextRequest
) {
  try {
    const pathParts = request.nextUrl.pathname.split('/')
    const appId = pathParts[pathParts.length - 2] // /api/apps/[id]/ratings
    
    if (!appId) {
      return NextResponse.json({ error: "App ID not found" }, { status: 400 })
    }

    const ratings = await prisma.rating.findMany({
      where: {
        appId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

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
      ratings,
      averageRating: averageRating._avg.rating,
      totalRatings: averageRating._count.rating
    })
  } catch (error) {
    console.error("[GET_RATINGS] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch ratings" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const pathParts = request.nextUrl.pathname.split('/')
    const appId = pathParts[pathParts.length - 2] // /api/apps/[id]/ratings
    
    if (!appId) {
      return NextResponse.json({ error: "App ID not found" }, { status: 400 })
    }

    const data = await request.json()
    const { rating } = data

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 })
    }

    const newRating = await prisma.rating.create({
      data: {
        rating,
        userId: user.id,
        appId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    })

    return NextResponse.json(newRating)
  } catch (error) {
    console.error("[CREATE_RATING] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create rating" },
      { status: 500 }
    )
  }
} 