import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/utils"

export async function POST(
  request: NextRequest
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const pathParts = request.nextUrl.pathname.split('/')
    const appId = pathParts[pathParts.length - 4] // /api/apps/[id]/comments/[commentId]/reply
    const parentCommentId = pathParts[pathParts.length - 2]

    if (!appId || !parentCommentId) {
      return NextResponse.json({ error: "Invalid request parameters" }, { status: 400 })
    }

    const data = await request.json()
    const { comment } = data

    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
      return NextResponse.json({ error: "Comment is required" }, { status: 400 })
    }

    const newComment = await prisma.comment.create({
      data: {
        comment,
        userId: user.id,
        appId,
        parentId: parentCommentId
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

    return NextResponse.json(newComment)
  } catch (error) {
    console.error("[CREATE_REPLY] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create reply" },
      { status: 500 }
    )
  }
} 