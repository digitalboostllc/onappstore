import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { notificationService } from "@/lib/services/notification-service"

export async function PATCH(
  request: Request
) {
  try {
    const id = request.url.split('/').pop()
    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 })
    }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await notificationService.markAsRead(id, user.id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request
) {
  try {
    const id = request.url.split('/').pop()
    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 })
    }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await notificationService.deleteNotification(id, user.id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
} 