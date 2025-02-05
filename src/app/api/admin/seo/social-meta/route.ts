import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user?.isAdmin) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const socialMeta = await prisma.socialMeta.findFirst()
    return NextResponse.json(socialMeta)
  } catch (error) {
    console.error("[SOCIAL_META_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user?.isAdmin) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { og, twitter } = await req.json()

    const socialMeta = await prisma.socialMeta.upsert({
      where: { id: "1" }, // Single record
      create: {
        id: "1",
        og: og as any,
        twitter: twitter as any,
      },
      update: {
        og: og as any,
        twitter: twitter as any,
      },
    })

    return NextResponse.json(socialMeta)
  } catch (error) {
    console.error("[SOCIAL_META_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
} 