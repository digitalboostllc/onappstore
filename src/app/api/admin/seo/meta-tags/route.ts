import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user?.isAdmin) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const metaTags = await prisma.seoMetaTag.findMany()
    return NextResponse.json(metaTags)
  } catch (error) {
    console.error("[META_TAGS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user?.isAdmin) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    const { page, metaTags } = body

    const existingMetaTags = await prisma.seoMetaTag.findUnique({
      where: { page }
    })

    if (existingMetaTags) {
      const updatedMetaTags = await prisma.seoMetaTag.update({
        where: { page },
        data: {
          title: metaTags.title,
          description: metaTags.description,
          keywords: metaTags.keywords,
          canonical: metaTags.canonical,
          updatedAt: new Date()
        }
      })
      return NextResponse.json(updatedMetaTags)
    }

    const newMetaTags = await prisma.seoMetaTag.create({
      data: {
        page,
        title: metaTags.title,
        description: metaTags.description,
        keywords: metaTags.keywords,
        canonical: metaTags.canonical
      }
    })

    return NextResponse.json(newMetaTags)
  } catch (error) {
    console.error("[META_TAGS_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
} 