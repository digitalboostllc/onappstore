import { NextResponse } from "next/server"
import { syncApps } from "@/lib/services/sync-service"

// Vercel Cron Job
// This endpoint will be called daily at midnight
// Add this URL to your Vercel project's Cron Jobs:
// /api/cron/sync
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes

export async function GET(request: Request) {
  try {
    // Verify the request is from Vercel Cron
    // You might want to add authorization here
    
    const stats = await syncApps()
    
    return NextResponse.json({
      success: true,
      message: "Sync completed successfully",
      stats
    })
  } catch (error) {
    console.error("Cron sync failed:", error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Sync failed",
      },
      { status: 500 }
    )
  }
} 