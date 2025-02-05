import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { registerSchema } from "@/lib/auth/auth.schema"

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const body = registerSchema.parse(json)

    const userExists = await prisma.user.findUnique({
      where: { email: body.email },
    })

    if (userExists) {
      return new NextResponse("User already exists", { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(body.password, 10)

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: hashedPassword,
      },
    })

    return NextResponse.json({
      user: {
        name: user.name,
        email: user.email,
      },
    })
  } catch (error) {
    return new NextResponse(
      "Something went wrong. Please try again.",
      { status: 500 }
    )
  }
} 