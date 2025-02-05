import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user?.isAdmin) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const sitemapConfig = await prisma.sitemapConfig.findMany()
    return NextResponse.json(sitemapConfig)
  } catch (error) {
    console.error("[SITEMAP_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user?.isAdmin) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { entries } = await req.json()

    // Delete existing entries
    await prisma.sitemapConfig.deleteMany()

    // Create new entries
    const newEntries = await prisma.sitemapConfig.createMany({
      data: entries.map((entry: any) => ({
        path: entry.path,
        changefreq: entry.changefreq,
        priority: entry.priority,
        enabled: entry.enabled,
      })),
    })

    return NextResponse.json(newEntries)
  } catch (error) {
    console.error("[SITEMAP_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
} 