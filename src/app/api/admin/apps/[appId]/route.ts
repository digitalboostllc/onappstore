import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/utils"
import { logActivity } from "@/lib/services/activity-logger"
import { cleanupAppFiles } from "@/lib/services/file-service"
import { Prisma } from "@prisma/client"

type ActivityAction = "PUBLISH" | "UNPUBLISH" | "DELETE"

export async function POST(
  request: NextRequest
) {
  try {
    // Check if user is authenticated and is admin
    const user = await getCurrentUser()
    if (!user?.isAdmin) {
      console.error("[APP_ACTION] Unauthorized access attempt")
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { action } = await request.json()
    const pathParts = request.nextUrl.pathname.split('/')
    const appId = pathParts[pathParts.length - 1]
    
    if (!appId) {
      return new NextResponse("App ID not found", { status: 400 })
    }

    console.log(`[APP_ACTION] Processing action: ${action} for app: ${appId}`)

    if (!["approve", "unpublish", "delete"].includes(action)) {
      console.error(`[APP_ACTION] Invalid action attempted: ${action}`)
      return new NextResponse("Invalid action", { status: 400 })
    }

    // Get the app
    const app = await prisma.app.findUnique({
      where: { id: appId },
      include: { developer: true }
    })

    if (!app) {
      console.error(`[APP_ACTION] App not found: ${appId}`)
      return new NextResponse("App not found", { status: 404 })
    }

    // Perform the requested action
    let updatedApp
    try {
      switch (action) {
        case "approve":
          updatedApp = await prisma.app.update({
            where: { id: appId },
            data: { published: true },
            include: {
              developer: {
                include: {
                  user: {
                    select: {
                      name: true,
                      image: true,
                    },
                  },
                },
              },
              category: true,
              subcategory: true,
              _count: {
                select: {
                  downloads: true,
                  favorites: true,
                },
              },
            },
          })
          await logActivity({
            userId: user.id,
            action: "PUBLISH" as ActivityAction,
            entityType: "APP",
            entityId: appId,
          })
          break

        case "unpublish":
          updatedApp = await prisma.app.update({
            where: { id: appId },
            data: { published: false },
            include: {
              developer: {
                include: {
                  user: {
                    select: {
                      name: true,
                      image: true,
                    },
                  },
                },
              },
              category: true,
              subcategory: true,
              _count: {
                select: {
                  downloads: true,
                  favorites: true,
                },
              },
            },
          })
          await logActivity({
            userId: user.id,
            action: "UNPUBLISH" as ActivityAction,
            entityType: "APP",
            entityId: appId,
          })
          break

        case "delete":
          // Get app details before deletion for cleanup
          const appToDelete = await prisma.app.findUnique({
            where: { id: appId },
            select: {
              icon: true,
              screenshots: true
            }
          })

          if (appToDelete) {
            // Clean up files first
            await cleanupAppFiles(appToDelete)
          }

          // Then delete from database
          await prisma.app.delete({
            where: { id: appId }
          })
          await logActivity({
            userId: user.id,
            action: "DELETE" as ActivityAction,
            entityType: "APP",
            entityId: appId,
          })
          break
      }

      // Convert BigInt to string in the response
      const serializedApp = updatedApp ? JSON.parse(
        JSON.stringify(updatedApp, (key, value) => 
          typeof value === 'bigint' ? value.toString() : value
        )
      ) : { success: true }

      console.log(`[APP_ACTION] Successfully processed ${action} for app: ${appId}`)
      return NextResponse.json(serializedApp)
    } catch (error) {
      console.error(`[APP_ACTION] Error performing ${action} on app ${appId}:`, error)
      throw new Error(`Failed to ${action} app: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  } catch (error) {
    console.error("[APP_ACTION] Error:", error)
    return new NextResponse(
      error instanceof Error ? error.message : "Failed to process action",
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest
) {
  try {
    const user = await getCurrentUser()
    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const pathParts = request.nextUrl.pathname.split('/')
    const appId = pathParts[pathParts.length - 1]
    
    if (!appId) {
      return NextResponse.json({ error: "App ID not found" }, { status: 400 })
    }

    const data = await request.json()
    console.log("Received update data:", data)

    const app = await prisma.app.findUnique({
      where: { id: appId },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        developer: true,
        category: true,
        subcategory: true,
      },
    })

    if (!app) {
      return NextResponse.json({ error: "App not found" }, { status: 404 })
    }

    // Update app details
    const updateData: Prisma.AppUpdateInput = {}
    
    // Only include fields that are provided in the request
    if (data.name !== undefined) updateData.name = data.name
    if (data.fullContent !== undefined) updateData.fullContent = data.fullContent
    if (data.description !== undefined) updateData.description = data.description
    
    // Handle category and subcategory updates
    if (data.categoryId !== undefined) {
      updateData.category = { connect: { id: data.categoryId } }
      
      // If changing category or subcategory is not provided, disconnect subcategory
      if (app.categoryId !== data.categoryId || data.subcategoryId === undefined) {
        updateData.subcategory = { disconnect: true }
      }
    }

    // Handle subcategory updates only if explicitly provided
    if (data.subcategoryId !== undefined) {
      updateData.subcategory = data.subcategoryId
        ? { connect: { id: data.subcategoryId } }
        : { disconnect: true }
    }

    if (data.tags !== undefined) updateData.tags = data.tags
    if (data.website !== undefined) updateData.website = data.website
    if (data.shortDescription !== undefined) updateData.shortDescription = data.shortDescription
    
    console.log("Update data:", updateData)
    
    // Handle developer updates
    if (data.developer) {
      updateData.developer = {
        update: {
          companyName: data.developer.companyName,
          verified: data.developer.verified,
        }
      }
    }

    try {
      const updatedApp = await prisma.app.update({
        where: { id: appId },
        data: updateData,
        include: {
          versions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          developer: true,
          category: true,
          subcategory: true,
        },
      })

      // Convert BigInt to string in the response
      const serializedApp = JSON.parse(
        JSON.stringify(updatedApp, (key, value) => 
          typeof value === 'bigint' ? value.toString() : value
        )
      )

      return NextResponse.json(serializedApp)
    } catch (prismaError) {
      console.error("Prisma update error:", prismaError)
      return NextResponse.json(
        { error: "Failed to update app in database" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("[APP_ACTION] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update app" },
      { status: 500 }
    )
  }
} 