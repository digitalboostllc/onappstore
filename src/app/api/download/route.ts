import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const appId = searchParams.get("appId")
    const versionId = searchParams.get("versionId")

    if (!appId || !versionId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      )
    }

    const app = await prisma.app.findUnique({
      where: { id: appId },
      include: {
        versions: {
          where: { id: versionId },
          take: 1
        }
      }
    })

    if (!app || !app.versions.length) {
      return NextResponse.json(
        { error: "App or version not found" },
        { status: 404 }
      )
    }

    // Record the download
    await prisma.download.create({
      data: {
        appId,
        versionId,
        userId: user.id
      }
    })

    // Redirect to the file URL
    const fileUrl = app.versions[0].fileUrl
    if (!fileUrl) {
      return NextResponse.json(
        { error: "File URL not found" },
        { status: 404 }
      )
    }

    return NextResponse.redirect(fileUrl)
  } catch (error) {
    console.error("[DOWNLOAD] Error:", error)
    return NextResponse.json(
      { error: "Failed to process download" },
      { status: 500 }
    )
  }
} 