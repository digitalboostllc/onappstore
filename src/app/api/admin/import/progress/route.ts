import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/utils"

export async function GET(request: Request) {
  try {
    // Check if user is authenticated and is admin
    const user = await getCurrentUser()
    if (!user?.isAdmin) {
      return new Response("Unauthorized", { status: 401 })
    }

    // Set up SSE headers
    const headers = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    }

    const stream = new ReadableStream({
      start(controller) {
        // Send initial progress
        controller.enqueue(`data: ${JSON.stringify({
          progress: 0,
          message: "Starting import...",
          count: 0
        })}\n\n`)

        // Keep connection alive
        const interval = setInterval(() => {
          controller.enqueue(": keepalive\n\n")
        }, 15000)

        // Clean up
        request.signal.addEventListener("abort", () => {
          clearInterval(interval)
          controller.close()
        })
      }
    })

    return new Response(stream, { headers })
  } catch (error) {
    console.error("Error setting up progress stream:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
} 