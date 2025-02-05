import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/utils"
import { scrapeAppDetails } from "@/lib/services/scraper"

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    
    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { url } = await req.json()
    
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Extract app ID and source from URL
    let appId: string | null = null
    let source: "macupdate" | "torrentmac" = "macupdate"

    if (url.includes("macupdate.com")) {
      const match = url.match(/\/app\/mac\/(\d+)/)
      if (!match) {
        return NextResponse.json({ error: "Invalid MacUpdate URL" }, { status: 400 })
      }
      appId = match[1]
      source = "macupdate"
    } else if (url.includes("torrentmac.net")) {
      // Extract post ID from TorrentMac URL
      const match = url.match(/\/(\d+)\//)
      if (!match) {
        return NextResponse.json({ error: "Invalid TorrentMac URL" }, { status: 400 })
      }
      appId = match[1]
      source = "torrentmac"
    } else {
      return NextResponse.json({ error: "Unsupported source" }, { status: 400 })
    }

    // Create basic info object for scraping
    const basicInfo = {
      name: "",
      version: null,
      iconUrl: null,
      detailUrl: url,
      appId,
    }

    // Scrape app details without saving to database
    const appData = await scrapeAppDetails(basicInfo)
    
    if (!appData) {
      return NextResponse.json({ error: "Failed to scrape app data" }, { status: 500 })
    }

    return NextResponse.json(appData)
  } catch (error) {
    console.error("[TEST_IMPORT_ERROR]", error)
    return NextResponse.json(
      { error: "Failed to test import" },
      { status: 500 }
    )
  }
} 