import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const json = await req.json()
    const { name, email } = json

    if (!name || !email) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Check if email is already taken by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        NOT: {
          id: user.id,
        },
      },
    })

    if (existingUser) {
      return new NextResponse("Email already taken", { status: 400 })
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { name, email },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error("[PROFILE_PATCH]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
} 