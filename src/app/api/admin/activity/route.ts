import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/utils"
import { getActivityLogs } from "@/lib/services/activity-logger"

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user?.isAdmin) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1
    const entityType = searchParams.get("entityType") || undefined
    const action = searchParams.get("action") || undefined

    const data = await getActivityLogs({
      page,
      entityType: entityType as any,
      action: action as any,
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error("[ACTIVITY_LOGS]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
} 