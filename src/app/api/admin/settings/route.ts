import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/utils"
import { getSettings, updateSettings } from "@/lib/services/settings-service"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user?.isAdmin) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const settings = await getSettings()
    return NextResponse.json(settings)
  } catch (error) {
    console.error("[SETTINGS_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user?.isAdmin) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const data = await req.json()
    const settings = await updateSettings(data)
    
    return NextResponse.json(settings)
  } catch (error) {
    console.error("[SETTINGS_UPDATE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
} 