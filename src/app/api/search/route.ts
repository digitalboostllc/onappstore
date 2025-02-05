import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")

  if (!query) {
    return NextResponse.json([])
  }

  try {
    const apps = await prisma.app.findMany({
      where: {
        name: {
          contains: query,
          mode: "insensitive"
        },
        published: true
      },
      select: {
        id: true,
        name: true,
        category: true,
        vendor: true
      },
      take: 5,
      orderBy: {
        name: "asc"
      }
    })

    return NextResponse.json(apps)
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json([], { status: 500 })
  }
} 