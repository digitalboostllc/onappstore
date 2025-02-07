import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export const runtime = "edge"
export const preferredRegion = "iad1"
export const dynamic = "force-dynamic"

// Helper function to safely execute cleanup
async function executeCleanup() {
  try {
    // Clean up prepared statements
    await prisma.$executeRaw`DEALLOCATE ALL`
    
    // Terminate idle connections
    await prisma.$executeRaw`SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE application_name = 'prisma' 
      AND state = 'idle'
      AND pid <> pg_backend_pid()`

    // Clean up old jobs
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    await prisma.job.deleteMany({
      where: {
        OR: [
          { status: "completed", updatedAt: { lt: oneHourAgo } },
          { status: "failed", updatedAt: { lt: oneHourAgo } }
        ]
      }
    })

    return { success: true }
  } catch (error) {
    console.error("Cleanup error:", error)
    throw error
  }
}

export async function GET(request: Request) {
  try {
    // Verify that this is a cron job request
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await executeCleanup()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in cleanup endpoint:", error)
    return NextResponse.json(
      { error: "Cleanup failed" },
      { status: 500 }
    )
  }
} 