import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { getCurrentUser } from "@/lib/auth/utils"

const commentSchema = z.object({
  comment: z.string().min(1),
  parentId: z.string().optional(),
})

export async function POST(
  request: NextRequest
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const pathParts = request.nextUrl.pathname.split('/')
    const appId = pathParts[pathParts.length - 2] // /api/apps/[id]/comments
    
    if (!appId) {
      return NextResponse.json({ error: "App ID not found" }, { status: 400 })
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
        appId
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
    console.error("[CREATE_COMMENT] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create comment" },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest
) {
  try {
    const pathParts = request.nextUrl.pathname.split('/')
    const appId = pathParts[pathParts.length - 2] // /api/apps/[id]/comments
    
    if (!appId) {
      return NextResponse.json({ error: "App ID not found" }, { status: 400 })
    }

    const comments = await prisma.comment.findMany({
      where: {
        appId,
        parentId: null, // Only get top-level comments
        isHidden: false
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        replies: {
          where: {
            isHidden: false
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        _count: {
          select: {
            replies: true
          }
        }
      }
    })

    return NextResponse.json(comments)
  } catch (error) {
    console.error("[GET_COMMENTS] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch comments" },
      { status: 500 }
    )
  }
} 