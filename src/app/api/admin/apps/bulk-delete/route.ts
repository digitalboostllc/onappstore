import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/utils"
import { logActivity } from "@/lib/services/activity-logger"

export async function POST(req: Request) {
  try {
    // Check if user is authenticated and is admin
    const user = await getCurrentUser()
    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { appIds } = await req.json()

    if (!Array.isArray(appIds) || appIds.length === 0) {
      return NextResponse.json(
        { error: "No app IDs provided" },
        { status: 400 }
      )
    }

    // Delete apps in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete all apps
      await tx.app.deleteMany({
        where: {
          id: {
            in: appIds
          }
        }
      })

      // Log activity for each app
      for (const appId of appIds) {
        await logActivity({
          userId: user.id,
          action: "DELETE",
          entityType: "APP",
          entityId: appId,
        })
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: `Successfully deleted ${appIds.length} apps` 
    })
  } catch (error) {
    console.error("Error deleting apps:", error)
    return NextResponse.json(
      { error: "Failed to delete apps" },
      { status: 500 }
    )
  }
} 