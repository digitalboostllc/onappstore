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

    const { appIds, action } = await req.json()

    if (!Array.isArray(appIds) || appIds.length === 0) {
      return NextResponse.json(
        { error: "No app IDs provided" },
        { status: 400 }
      )
    }

    if (!["approve", "unpublish", "delete"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      )
    }

    // Handle actions in a transaction
    await prisma.$transaction(async (tx) => {
      if (action === "delete") {
        await tx.app.deleteMany({
          where: { id: { in: appIds } }
        })
      } else {
        await tx.app.updateMany({
          where: { id: { in: appIds } },
          data: { 
            published: action === "approve" ? true : false 
          }
        })
      }

      // Log activity for each app
      for (const appId of appIds) {
        await logActivity({
          userId: user.id,
          action: action.toUpperCase(),
          entityType: "APP",
          entityId: appId,
        })
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: `Successfully ${action}ed ${appIds.length} apps` 
    })
  } catch (error) {
    console.error("Error performing bulk action:", error)
    return NextResponse.json(
      { error: "Failed to perform bulk action" },
      { status: 500 }
    )
  }
} 