import { prisma } from "@/lib/db"
import { Prisma } from "@prisma/client"

interface GetFilteredAppsOptions {
  categoryId?: string
  subcategoryId?: string
  sort?: string
  price?: string
  rating?: string
  page?: number
  limit?: number
}

export async function getFilteredApps({
  categoryId,
  subcategoryId,
  sort = "popularity",
  price = "all",
  rating = "1",
  page = 1,
  limit = 12,
}: GetFilteredAppsOptions) {
  try {
    // Base query conditions
    const baseWhere = {
      published: true,
      ...(subcategoryId
        ? { categoryId, subcategoryId }
        : categoryId
        ? { OR: [{ categoryId }, { subcategoryId: categoryId }] }
        : {}),
      ...(price === "free" ? { price: "0" } : price === "paid" ? { price: { not: "0" } } : {}),
    }

    // Get apps with their stats for sorting and filtering
    const appsWithStats = await prisma.app.findMany({
      where: baseWhere,
      include: {
        ratings: {
          select: {
            rating: true,
          },
        },
        _count: {
          select: {
            ratings: true,
            downloads: true,
          },
        },
      },
    })

    // Calculate average ratings and prepare sorting data
    const appsWithMetrics = appsWithStats
      .map(app => {
        const ratings = app.ratings.map(r => r.rating)
        const avgRating = ratings.length > 0
          ? ratings.reduce((a, b) => a + b, 0) / ratings.length
          : 0
        return {
          id: app.id,
          avgRating,
          ratingCount: app._count.ratings,
          downloadCount: app._count.downloads,
        }
      })
      .filter(app => app.avgRating >= Number(rating))

    // Sort apps based on selected criteria
    const sortedAppIds = [...appsWithMetrics]
      .sort((a, b) => {
        switch (sort) {
          case "popularity":
            return b.ratingCount - a.ratingCount
          case "downloads":
            return b.downloadCount - a.downloadCount
          case "rating":
            return b.avgRating - a.avgRating
          default:
            return 0
        }
      })
      .map(app => app.id)

    // Get the final apps with all their data
    const [apps, total] = await Promise.all([
      prisma.app.findMany({
        where: {
          id: { in: sortedAppIds },
        },
        include: {
          developer: {
            include: {
              user: true
            }
          },
          category: true,
          subcategory: true,
          versions: {
            take: 1,
            orderBy: {
              createdAt: 'desc'
            },
            include: {
              _count: {
                select: {
                  downloads: true
                }
              }
            }
          },
          ratings: {
            include: {
              user: true
            }
          },
          comments: {
            include: {
              user: true
            }
          },
          _count: {
            select: {
              ratings: true,
              downloads: true,
              favorites: true,
              comments: true
            }
          }
        },
        orderBy: sort === "price" 
          ? { price: "asc" }
          : { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.app.count({
        where: {
          id: { in: sortedAppIds },
        }
      })
    ])

    // Maintain the correct order for non-price sorts
    const sortedApps = sort === "price" 
      ? apps 
      : apps.sort((a, b) => {
          const aIndex = sortedAppIds.indexOf(a.id)
          const bIndex = sortedAppIds.indexOf(b.id)
          return aIndex - bIndex
        })

    // Transform apps to include averageRating and release_notes
    const transformedApps = sortedApps.map(app => {
      const ratings = app.ratings.map(r => r.rating)
      const averageRating = ratings.length > 0
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : 0

      return {
        ...app,
        averageRating,
        release_notes: app.versions[0]?.changelog || null,
        fileSize: app.fileSize ? Number(app.fileSize) : null
      }
    })

    return {
      apps: transformedApps,
      total,
      pages: Math.ceil(total / limit)
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error fetching filtered apps:", error.message)
    }
    return { apps: [], total: 0, pages: 0 }
  }
} 