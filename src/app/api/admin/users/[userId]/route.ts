import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/utils"
import { updateUser, deleteUser } from "@/lib/services/user-service"

interface RouteContext {
  params: Promise<{
    userId: string
  }>
}

export async function PATCH(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getCurrentUser()

    if (!user?.isAdmin) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { action } = await req.json()
    const { userId } = await context.params

    // Prevent admins from modifying their own account
    if (userId === user.id) {
      return new NextResponse(
        "You cannot modify your own account", 
        { status: 403 }
      )
    }

    if (!["promote", "demote", "ban", "unban", "delete"].includes(action)) {
      return new NextResponse("Invalid action", { status: 400 })
    }

    switch (action) {
      case "promote":
        await updateUser(userId, { isAdmin: true })
        break

      case "demote":
        await updateUser(userId, { isAdmin: false })
        break

      case "ban":
        await updateUser(userId, { isBanned: true })
        break

      case "unban":
        await updateUser(userId, { isBanned: false })
        break

      case "delete":
        await deleteUser(userId)
        break
    }

    return new NextResponse("Success", { status: 200 })
  } catch (error) {
    console.error("[USER_ACTION]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
} 