import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/utils"
import { getAppStats } from "@/lib/services/developer-service"

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const appId = searchParams.get("appId")

    if (!appId) {
      return NextResponse.json({ error: "App ID is required" }, { status: 400 })
    }

    const stats = await getAppStats(appId)
    return NextResponse.json(stats)
  } catch (error) {
    console.error("[APP_STATS]", error)
    return NextResponse.json(
      { error: "Failed to fetch app stats" },
      { status: 500 }
    )
  }
} 