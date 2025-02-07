import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/utils"
import { getUserActivity } from "@/lib/services/admin-service"

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export const revalidate = 60 // Cache for 1 minute (activity logs change more frequently)

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const limit = searchParams.get("limit")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const activities = await getUserActivity(
      userId,
      limit ? parseInt(limit) : undefined
    )
    
    return new NextResponse(JSON.stringify(activities), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
      },
    })
  } catch (error) {
    console.error("[USER_ACTIVITY]", error)
    return NextResponse.json(
      { error: "Failed to fetch user activity" },
      { status: 500 }
    )
  }
} 