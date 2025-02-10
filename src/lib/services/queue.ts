import { prisma } from "@/lib/prisma"
import { scrapeMacUpdate } from "@/lib/services/scraper"
import type { AppData } from "@/lib/services/scraper"
import { processRequirements } from "./scraper"

export type JobStatus = "pending" | "processing" | "completed" | "failed"

export interface Job {
  id: string
  type: "import" | "sync"
  status: JobStatus
  progress: number
  total: number
  error?: string
  createdAt: Date
  updatedAt: Date
}

// Helper to handle BigInt serialization
function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return Number(obj);
  }
  
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }
  
  if (typeof obj === 'object') {
    const converted: any = {};
    for (const key in obj) {
      converted[key] = serializeBigInt(obj[key]);
    }
    return converted;
  }
  
  return obj;
}

export async function createImportJob() {
  return prisma.job.create({
    data: {
      type: "import",
      status: "pending",
      progress: 0,
      total: 0,
    },
  })
}

export async function updateJobProgress(jobId: string, progress: number, total: number) {
  return prisma.job.update({
    where: { id: jobId },
    data: {
      progress,
      total,
      updatedAt: new Date(),
    },
  })
}

export async function completeJob(jobId: string) {
  return prisma.job.update({
    where: { id: jobId },
    data: {
      status: "completed",
      updatedAt: new Date(),
    },
  })
}

export async function failJob(jobId: string, error: string) {
  return prisma.job.update({
    where: { id: jobId },
    data: {
      status: "failed",
      error,
      updatedAt: new Date(),
    },
  })
}

export async function processImportJob(jobId: string, limit?: number, importAll: boolean = false) {
  // Set a timeout for the entire job (14s to stay under Vercel's 15s limit)
  const timeout = setTimeout(() => {
    failJob(jobId, "Job timed out after 14 seconds")
  }, 14000)

  try {
    console.log("Starting import job:", jobId, { limit, importAll })
    
    // Update job status to processing
    await prisma.job.update({
      where: { id: jobId },
      data: { status: "processing" },
    })

    // Process in smaller batches
    const batchSize = 5 // Reduced batch size for better performance
    let processedCount = 0
    let successCount = 0
    let errorCount = 0
    let errors: Array<{ name: string; error: string; details?: any }> = []

    // Get apps from MacUpdate based on import type
    const requestedLimit = importAll ? undefined : limit
    console.log("Requesting apps:", importAll ? "all apps" : `with limit ${requestedLimit}`)
    const apps = await scrapeMacUpdate(requestedLimit, importAll)
    console.log(`Retrieved ${apps.length} apps from MacUpdate`)

    // Process in batches
    for (let i = 0; i < apps.length && processedCount < (limit || Infinity); i += batchSize) {
      const batch = apps.slice(i, Math.min(i + batchSize, apps.length))
      
      // Process batch with timeout
      const batchTimeout = setTimeout(() => {
        console.warn(`Batch ${i / batchSize + 1} timed out`)
      }, 5000) // 5 second timeout per batch

      try {
        await Promise.all(batch.map(async (app) => {
          try {
            // Process app...
            processedCount++
            successCount++
          } catch (error) {
            errorCount++
            const errorMessage = error instanceof Error ? error.message : "Unknown error"
            errors.push({ name: app.name || "Unknown", error: errorMessage })
          }
        }))
      } finally {
        clearTimeout(batchTimeout)
      }

      // Update progress
      await prisma.job.update({
        where: { id: jobId },
        data: {
          progress: processedCount,
          total: apps.length,
        },
      })
    }

    // Create summary
    const summary = `Import completed. Processed ${processedCount} apps. Success: ${successCount}, Errors: ${errorCount}`
    console.log(summary)

    // Update job status
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "completed",
        error: errorCount > 0 ? JSON.stringify(errors) : undefined,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    console.error("Import job failed:", errorMessage)
    await failJob(jobId, errorMessage)
  } finally {
    clearTimeout(timeout)
  }
}

// Function to check for new apps daily
export async function syncNewApps() {
  try {
    console.log("Starting sync of new apps...")
    
    // Get latest apps from MacUpdate
    const apps = await scrapeMacUpdate(100) // Get a good batch of latest apps
    console.log(`Retrieved ${apps.length} apps from MacUpdate`)
    
    if (apps.length === 0) {
      console.log("No new apps found")
      return
    }

    // Find the first admin user
    const adminUser = await prisma.user.findFirst({
      where: { isAdmin: true },
      include: {
        developer: true
      }
    })

    if (!adminUser) {
      throw new Error("No admin user found in the system")
    }

    // Get or create developer account for admin
    const adminDev = adminUser.developer || await prisma.developer.create({
      data: {
        userId: adminUser.id,
        verified: true,
      },
    })

    // Pre-process all vendors first to avoid race conditions
    const vendorMap = new Map()
    console.log("Pre-processing vendors...")
    
    for (const app of apps) {
      if (app?.vendorData) {
        const vendorKey = app.vendorData.id.toString()
        if (!vendorMap.has(vendorKey)) {
          try {
            const vendor = await prisma.vendor.upsert({
              where: {
                externalId: app.vendorData.id,
              },
              update: {
                title: app.vendorData.title,
                description: app.vendorData.description,
                logoUrl: app.vendorData.logo?.url || null,
              },
              create: {
                externalId: app.vendorData.id,
                slug: app.vendorData.slug || app.vendorData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                title: app.vendorData.title,
                description: app.vendorData.description,
                logoUrl: app.vendorData.logo?.url || null,
              },
            })
            vendorMap.set(vendorKey, vendor.id)
          } catch (error) {
            console.error(`Failed to create vendor for ${app.name}:`, error)
          }
        }
      }
    }
    
    console.log(`Pre-processed ${vendorMap.size} vendors`)

    let successCount = 0
    let errorCount = 0

    for (const app of apps) {
      try {
        // Check if app already exists
        const existingApp = await prisma.app.findFirst({
          where: {
            AND: [
              { name: app.name },
              { developerId: adminDev.id }
            ]
          },
        })

        if (existingApp) {
          console.log(`App already exists: ${app.name}`)
          continue
        }

        // Find category by macUpdateId
        let categoryInfo: { categoryId: string | null, subcategoryId: string | null } | null = null
        if (app.category?.macUpdateId || app.category?.subcategoryMacUpdateId) {
          // Try to find by subcategory ID first if it exists
          if (app.category.subcategoryMacUpdateId) {
            const subcategory = await prisma.category.findUnique({
              where: { macUpdateId: app.category.subcategoryMacUpdateId.toString() },
              include: { parent: true }
            })

            if (subcategory && subcategory.parent) {
              categoryInfo = {
                categoryId: subcategory.parent.id,
                subcategoryId: subcategory.id
              }
              console.log(`Found by subcategory: ${subcategory.name} (${subcategory.id}) under ${subcategory.parent.name} (${subcategory.parent.id})`)
            }
          }

          // If no subcategory found, try by main category ID
          if (!categoryInfo && app.category.macUpdateId) {
            const category = await prisma.category.findUnique({
              where: { macUpdateId: app.category.macUpdateId.toString() },
              include: { parent: true }
            })
            
            if (category) {
              categoryInfo = {
                categoryId: category.parent?.id || category.id,
                subcategoryId: category.parent ? category.id : null
              }
              console.log(`Found by main category: ${category.name} (${category.id})`)
            } else {
              console.log(`Category not found for macUpdateId: ${app.category.macUpdateId}. Please run Sync Categories first.`)
            }
          }
        } else {
          console.log(`Skipping app with missing macUpdateId in category`)
          continue
        }

        if (!categoryInfo) {
          console.log(`Skipping app "${app.name}" - category not synced yet. Please run Sync Categories first.`)
          continue
        }

        // Create new app
        if (!categoryInfo.categoryId) {
          console.log(`Skipping app "${app.name}" - invalid category ID`)
          continue
        }

        const requirementsObj = typeof app.requirements === 'object' && app.requirements !== null
          ? app.requirements
          : { minimum_os: typeof app.requirements === 'string' ? app.requirements : undefined }

        const processedReqs = processRequirements({
          ...requirementsObj,
          other_list: app.otherRequirements ? app.otherRequirements.split('\n') : undefined
        })
        const createdApp = await prisma.app.create({
          data: {
            name: app.name,
            description: app.description,
            fullContent: app.fullContent,
            categoryId: categoryInfo.categoryId,
            subcategoryId: categoryInfo.subcategoryId || undefined,
            website: app.website,
            icon: app.icon,
            published: false,
            developerId: adminDev.id,
            screenshots: (app.screenshots || []).filter(Boolean).filter(url => !url.includes('static.macupdate.com/submission')),
            requirements: processedReqs.requirements,
            otherRequirements: processedReqs.otherRequirements,
            bundleIds: app.bundleIds?.filter(id => id !== null) || [],
            shortDescription: app.shortDescription,
            downloadCount: app.downloadCount,
            downloadUrl: app.downloadUrl,
            isBeta: app.isBeta || false,
            isSupported: app.isSupported !== false,
            lastScanDate: app.lastScanDate,
            license: app.license,
            price: app.price,
            purchaseUrl: app.purchaseUrl,
            releaseDate: app.releaseDate ? new Date(app.releaseDate) : null,
            vendor: app.vendor,
            fileSize: app.fileSize ? BigInt(app.fileSize) : null,
            vendorId: app.vendorData?.id ? vendorMap.get(app.vendorData.id.toString()) : null,
            versions: app.version ? {
              create: {
                version: app.version,
                changelog: app.release_notes || null,
                minOsVersion: processedReqs.requirements || "macOS 10.0",
                fileUrl: app.downloadUrl || "",
                fileSize: app.fileSize ? BigInt(app.fileSize) : BigInt(0),
                sha256Hash: "",
              }
            } : undefined,
            version: app.version || null,
            originalCategory: app.category.parentName 
              ? `${app.category.parentName} › ${app.category.name}`
              : app.category.name,
          },
        })
        console.log(`Created app: ${app.name}`)
        successCount++
      } catch (error) {
        console.error(`Failed to sync app: ${app.name}`, error)
        errorCount++
      }
    }

    console.log(`Finished syncing new apps. Success: ${successCount}, Errors: ${errorCount}`)
  } catch (error) {
    console.error("Error during sync:", error)
  }
}
