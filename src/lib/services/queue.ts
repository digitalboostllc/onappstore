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
  try {
    console.log("Starting import job:", jobId, { limit, importAll })
    
    // Update job status to processing
    await prisma.job.update({
      where: { id: jobId },
      data: { status: "processing" },
    })

    // Get apps from MacUpdate based on import type
    const requestedLimit = importAll ? undefined : limit // Remove default 100 limit
    console.log("Requesting apps:", importAll ? "all apps" : `with limit ${requestedLimit}`)
    const apps = await scrapeMacUpdate(requestedLimit, importAll)
    console.log(`Retrieved ${apps.length} apps from MacUpdate`)
    
    if (apps.length === 0) {
      throw new Error("No apps retrieved from MacUpdate")
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

    // Import apps in batches
    const batchSize = 20
    let successCount = 0
    let errorCount = 0
    let errors: Array<{ name: string; error: string; details?: any }> = []
    
    for (let i = 0; i < apps.length; i += batchSize) {
      const batch = apps.slice(i, i + batchSize)
      console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(apps.length / batchSize)}`)
      
      // Process batch
      const results = await Promise.allSettled(
        batch.map(async (app: AppData) => {
          try {
            // Skip invalid apps
            if (!app) {
              const error = "Null app data"
              errors.push({ name: "Unknown", error })
              console.log("Skipping: " + error)
              return null
            }

            // Validate app data
            if (!app.name || !app.description || !app.category) {
              const missingFields = [
                !app.name && "name",
                !app.description && "description",
                !app.category && "category"
              ].filter(Boolean)
              
              const error = `Invalid app data - missing required fields: ${missingFields.join(", ")}`
              errors.push({ name: app.name || "Unknown", error })
              console.error(error)
              return null
            }

            // Check if app already exists by name and developer
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
              return null
            }

            // Skip if no category ID
            if (!app.category?.macUpdateId) {
              const error = "Missing category ID"
              errors.push({ name: app.name || "Unknown", error })
              console.error(`Skipping app: ${error}`)
              return null
            }

            // Create app with all data
            const createdApp = await prisma.app.create({
              data: {
                name: app.name,
                description: app.description,
                fullContent: app.fullContent,
                categoryId: app.category.macUpdateId,
                subcategoryId: app.category.subcategoryMacUpdateId || undefined,
                website: app.website,
                icon: app.icon,
                published: false,
                developerId: adminDev.id,
                screenshots: (app.screenshots || []).filter(Boolean).filter(url => !url.includes('static.macupdate.com/submission')),
                requirements: app.requirements,
                otherRequirements: app.otherRequirements,
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
                    minOsVersion: app.requirements || "macOS 10.0",
                    fileUrl: app.downloadUrl || "",
                    fileSize: app.fileSize ? BigInt(app.fileSize) : BigInt(0),
                    sha256Hash: "",
                  }
                } : undefined,
              },
            })

            successCount++
            return createdApp
          } catch (error) {
            errorCount++
            const errorMessage = error instanceof Error ? error.message : "Unknown error"
            errors.push({ name: app.name || "Unknown", error: errorMessage })
            console.error(`Failed to import app: ${app.name}`, error)
            return null
          }
        })
      )

      // Update job progress
      await prisma.job.update({
        where: { id: jobId },
        data: {
          progress: i + batch.length,
          total: apps.length,
          updatedAt: new Date(),
        },
      })
    }

    // Create summary
    const summary = `Import completed. Processed ${apps.length} apps. Success: ${successCount}, Errors: ${errorCount}`
    console.log(summary)
    if (errors.length > 0) {
      console.log("Errors:", errors)
    }

    // Update job status
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "completed",
        error: errorCount > 0 ? JSON.stringify(errors) : undefined,
        updatedAt: new Date(),
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    console.error("Import job failed:", errorMessage)
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "failed",
        error: errorMessage,
        updatedAt: new Date(),
      },
    })
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
