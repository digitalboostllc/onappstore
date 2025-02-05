import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { isAdmin: true },
    })

    if (!user?.isAdmin) {
      return new Response("Forbidden", { status: 403 })
    }

    // Fetch all comments with related data
    const comments = await prisma.comment.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        app: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Transform dates to ISO strings
    const formattedComments = comments.map(comment => ({
      ...comment,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    }))

    return Response.json(formattedComments)
  } catch (error) {
    console.error("[GET_ADMIN_COMMENTS]", error)
    return new Response("Internal Server Error", { status: 500 })
  }
} 