import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/utils"

export async function PATCH(
  request: NextRequest
) {
  try {
    const user = await getCurrentUser()
    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const pathParts = request.nextUrl.pathname.split('/')
    const commentId = pathParts[pathParts.length - 2] // -2 because the last part is 'visibility'
    
    if (!commentId) {
      return NextResponse.json({ error: "Comment ID not found" }, { status: 400 })
    }

    const data = await request.json()
    const isHidden = Boolean(data.isHidden)

    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: { isHidden },
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

    return NextResponse.json(updatedComment)
  } catch (error) {
    console.error("[UPDATE_COMMENT_VISIBILITY] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update comment visibility" },
      { status: 500 }
    )
  }
} 