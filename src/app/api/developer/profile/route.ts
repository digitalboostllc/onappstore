import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/utils"

const updateProfileSchema = z.object({
  companyName: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  bio: z.string().max(500).optional(),
})

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const json = await req.json()
    const body = updateProfileSchema.parse(json)

    // Update both user and developer profiles
    const [updatedUser, updatedDeveloper] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          website: body.website,
          bio: body.bio,
        },
      }),
      prisma.developer.update({
        where: { userId: user.id },
        data: {
          companyName: body.companyName,
        },
      }),
    ])

    return NextResponse.json({
      ...updatedDeveloper,
      website: updatedUser.website,
      bio: updatedUser.bio,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 })
    }

    return new NextResponse(
      "Something went wrong. Please try again.",
      { status: 500 }
    )
  }
} 