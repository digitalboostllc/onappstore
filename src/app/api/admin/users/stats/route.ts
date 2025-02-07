import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/utils"
import { getUserStats } from "@/lib/services/admin-service"

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export const revalidate = 300 // Cache for 5 minutes

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const stats = await getUserStats(userId)
    
    return new NextResponse(JSON.stringify(stats), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    })
  } catch (error) {
    console.error("[USER_STATS]", error)
    return NextResponse.json(
      { error: "Failed to fetch user stats" },
      { status: 500 }
    )
  }
} 