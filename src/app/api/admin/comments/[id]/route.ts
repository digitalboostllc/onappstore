import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { getCurrentUser } from "@/lib/auth/utils"
import { Prisma } from "@prisma/client"

const updateSchema = z.object({
  comment: z.string().min(1),
})

export async function PATCH(
  request: NextRequest
) {
  try {
    const user = await getCurrentUser()
    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const pathParts = request.nextUrl.pathname.split('/')
    const commentId = pathParts[pathParts.length - 1]
    
    if (!commentId) {
      return NextResponse.json({ error: "Comment ID not found" }, { status: 400 })
    }

    const data = await request.json()

    const updateData: Prisma.CommentUpdateInput = {
      comment: data.content,
      updatedAt: new Date(),
      isHidden: data.isHidden
    }

    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: updateData,
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
    console.error("[UPDATE_COMMENT] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update comment" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest
) {
  try {
    const user = await getCurrentUser()
    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const pathParts = request.nextUrl.pathname.split('/')
    const commentId = pathParts[pathParts.length - 1]
    
    if (!commentId) {
      return NextResponse.json({ error: "Comment ID not found" }, { status: 400 })
    }

    await prisma.comment.delete({
      where: { id: commentId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DELETE_COMMENT] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete comment" },
      { status: 500 }
    )
  }
} 