import { prisma } from "@/lib/prisma"
import { fetchApps, type SourceApp } from "@/lib/source"
import { type App, type Prisma } from "@prisma/client"

export interface SyncStats {
  added: number
  updated: number
  unchanged: number
  removed: number
  errors: number
}

export type SyncStatus = "running" | "completed" | "failed"

type ExistingApp = Pick<App, "id" | "name" | "version" | "updatedAt" | "bundleIds" | "categoryId" | "developerId">

async function createSyncLog(): Promise<string> {
  const log = await prisma.syncLog.create({
    data: {
      status: "running",
    },
    select: {
      id: true
    }
  })
  return log.id
}

async function updateSyncLog(id: string, stats: SyncStats, status: SyncStatus, error?: string) {
  await prisma.syncLog.update({
    where: { id },
    data: {
      status,
      added: stats.added,
      updated: stats.updated,
      unchanged: stats.unchanged,
      removed: stats.removed,
      errors: stats.errors,
      error,
      endedAt: new Date(),
    }
  })
}

export async function syncApps(): Promise<SyncStats> {
  const stats: SyncStats = {
    added: 0,
    updated: 0,
    unchanged: 0,
    removed: 0,
    errors: 0,
  }

  const syncId = await createSyncLog()

  try {
    // Fetch all apps from source
    const sourceApps = await fetchApps()
    
    // Get all existing apps from our database
    const existingApps = await prisma.app.findMany({
      select: {
        id: true,
        name: true,
        version: true,
        updatedAt: true,
        bundleIds: true,
        categoryId: true,
        developerId: true,
      }
    })

    // Create a map for faster lookups
    const existingAppMap = new Map(
      existingApps.map(app => [app.bundleIds[0], app])
    )

    // Process each app from the source
    for (const sourceApp of sourceApps) {
      try {
        const existingApp = existingAppMap.get(sourceApp.bundleId)

        if (!existingApp) {
          // Get or create category and developer
          const [category, developer] = await Promise.all([
            prisma.category.findFirst({
              where: { id: sourceApp.categoryId }
            }),
            prisma.developer.findFirst({
              where: { verified: true }
            })
          ])

          if (!category || !developer) {
            console.error(`Missing category or developer for app ${sourceApp.name}`)
            stats.errors++
            continue
          }

          // New app - create it
          await prisma.app.create({
            data: {
              name: sourceApp.name,
              description: sourceApp.description,
              icon: sourceApp.icon,
              website: sourceApp.website,
              categoryId: category.id,
              subcategoryId: sourceApp.subcategoryId,
              tags: sourceApp.tags || [],
              published: true,
              developerId: developer.id,
              screenshots: sourceApp.screenshots || [],
              bundleIds: [sourceApp.bundleId],
              downloadCount: sourceApp.downloadCount || 0,
              downloadUrl: sourceApp.downloadUrl,
              isBeta: false,
              isSupported: true,
              lastScanDate: sourceApp.lastScanDate,
              license: sourceApp.license,
              price: sourceApp.price,
              releaseDate: sourceApp.releaseDate,
              vendor: sourceApp.vendor,
              fileSize: sourceApp.fileSize,
              version: sourceApp.version,
              requirements: sourceApp.requirements,
            }
          })
          stats.added++
        } else if (existingApp.version !== sourceApp.version) {
          // App exists but needs update
          await prisma.app.update({
            where: { id: existingApp.id },
            data: {
              version: sourceApp.version,
              updatedAt: new Date(),
              icon: sourceApp.icon,
              website: sourceApp.website,
              subcategoryId: sourceApp.subcategoryId,
              tags: sourceApp.tags || [],
              screenshots: sourceApp.screenshots || [],
              downloadCount: sourceApp.downloadCount || 0,
              downloadUrl: sourceApp.downloadUrl,
              lastScanDate: sourceApp.lastScanDate,
              license: sourceApp.license,
              price: sourceApp.price,
              releaseDate: sourceApp.releaseDate,
              vendor: sourceApp.vendor,
              fileSize: sourceApp.fileSize,
              requirements: sourceApp.requirements,
            }
          })
          stats.updated++
        } else {
          stats.unchanged++
        }
      } catch (error) {
        console.error(`Error processing app ${sourceApp.name}:`, error)
        stats.errors++
      }
    }

    // Mark apps as unavailable if they're no longer in the source
    const sourceAppIds = new Set(sourceApps.map((app) => app.bundleId))
    const removedApps = existingApps.filter(app => !sourceAppIds.has(app.bundleIds[0]))
    
    if (removedApps.length > 0) {
      await prisma.app.updateMany({
        where: {
          id: {
            in: removedApps.map(app => app.id)
          }
        },
        data: {
          isSupported: false,
          updatedAt: new Date()
        }
      })
      stats.removed = removedApps.length
    }

    await updateSyncLog(syncId, stats, "completed")
    return stats
  } catch (error) {
    console.error("Sync failed:", error)
    await updateSyncLog(syncId, stats, "failed", error instanceof Error ? error.message : "Unknown error")
    throw error
  }
}

// Schedule periodic sync (e.g., daily)
export async function scheduleSync() {
  // This could be replaced with a proper cron job or task scheduler
  const SYNC_INTERVAL = 24 * 60 * 60 * 1000 // 24 hours

  setInterval(async () => {
    try {
      console.log("Starting scheduled sync...")
      const stats = await syncApps()
      console.log("Sync completed:", stats)
    } catch (error) {
      console.error("Scheduled sync failed:", error)
    }
  }, SYNC_INTERVAL)
} 