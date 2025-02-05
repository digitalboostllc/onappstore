import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/utils"
import { getUsers } from "@/lib/services/user-service"
import { prisma } from "@/lib/db"
import { hash } from "bcryptjs"
import { z } from "zod"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  isAdmin: z.boolean().default(false),
})

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user?.isAdmin) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const data = await getUsers({
      search: searchParams.get("search") || undefined,
      role: (searchParams.get("role") as "admin" | "user") || undefined,
      status: (searchParams.get("status") as "active" | "banned") || undefined,
      page: searchParams.get("page") ? parseInt(searchParams.get("page")!) : undefined,
    })

    if (!data || !data.users) {
      console.error("[USERS_GET] Invalid data structure returned from getUsers")
      return new NextResponse("Invalid data structure", { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("[USERS_GET]", error)
    return new NextResponse(
      error instanceof Error ? error.message : "Internal error", 
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    })

    if (!currentUser?.isAdmin) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const json = await req.json()
    const body = createUserSchema.parse(json)

    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    })

    if (existingUser) {
      return new NextResponse("User already exists", { status: 400 })
    }

    const hashedPassword = await hash(body.password, 10)

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: hashedPassword,
        isAdmin: body.isAdmin,
      },
    })

    // TODO: Send welcome email with credentials

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      isBanned: user.isBanned,
      createdAt: user.createdAt,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 422 })
    }

    return new NextResponse(null, { status: 500 })
  }
} 