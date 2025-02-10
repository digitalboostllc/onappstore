import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/utils"
import { dbLogger } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    // Check admin access
    const user = await getCurrentUser()
    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const lines = parseInt(searchParams.get('lines') || '100')
    
    // Get logs
    const logs = await dbLogger.getRecentLogs(lines)
    
    // Parse logs into structured format
    const structuredLogs = logs.map(log => {
      try {
        const match = log.match(/\[(.*?)\] (.*)/)
        if (!match) {
          return { error: 'Invalid log format', raw: log }
        }
        const [, timestamp, jsonStr] = match
        return {
          timestamp,
          ...JSON.parse(jsonStr)
        }
      } catch (e) {
        return { error: 'Failed to parse log entry', raw: log }
      }
    })

    return NextResponse.json({
      logs: structuredLogs,
      count: logs.length
    })
  } catch (error) {
    console.error("[LOGS]", error)
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    )
  }
} 