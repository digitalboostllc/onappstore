import { prisma } from "@/lib/prisma"
import { cache } from "react"
import type { App, User, ActivityLog } from "@prisma/client"

// Cache duration (2 minutes for admin data)
const CACHE_TIME = 2 * 60 * 1000

// Cache for admin apps
const adminAppsCache: {
  data: any[] | null
  timestamp: number
} = {
  data: null,
  timestamp: 0
}

// Cache for basic users list
const usersListCache = new Map<string, {
  data: any[]
  timestamp: number
}>()

// Cache for user stats
const userStatsCache = new Map<string, {
  data: {
    appsCount: number
    activitiesCount: number
    collectionsCount: number
  }
  timestamp: number
}>()

// Cache for user activity
const userActivityCache = new Map<string, {
  data: ActivityLog[]
  timestamp: number
}>()

// Cache for total users count
let totalUsersCache: {
  data: number | null
  timestamp: number
} = {
  data: null,
  timestamp: 0
}

// Cache for dashboard stats
let dashboardStatsCache: {
  data: {
    totalUsers: number
    totalApps: number
    totalDownloads: number
    recentActivities: any[]
  } | null
  timestamp: number
} = {
  data: null,
  timestamp: 0
}

// Helper to check if cache is valid
function isCacheValid(timestamp: number) {
  return Date.now() - timestamp < CACHE_TIME
}

// Helper to convert BigInt to Number
function convertBigIntToNumber(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj
  }
  
  if (typeof obj === 'bigint') {
    return Number(obj)
  }
  
  if (obj instanceof Date) {
    return obj.toISOString()
  }
  
  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToNumber)
  }
  
  if (typeof obj === 'object') {
    const converted: any = {}
    for (const key in obj) {
      converted[key] = convertBigIntToNumber(obj[key])
    }
    return converted
  }
  
  return obj
}

export const adminService = {
  getAdminApps: cache(async () => {
    // Check cache first
    if (adminAppsCache.data && isCacheValid(adminAppsCache.timestamp)) {
      return adminAppsCache.data
    }

    try {
      const [apps, ratings] = await Promise.all([
        prisma.app.findMany({
          include: {
            developer: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
            category: {
              select: {
                id: true,
                name: true,
              },
            },
            subcategory: {
              select: {
                id: true,
                name: true,
              },
            },
            _count: {
              select: {
                downloads: true,
                favorites: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        }),
        // Get average ratings using raw SQL for better performance
        prisma.$queryRaw`
          SELECT 
            "appId",
            ROUND(CAST(AVG(CAST("rating" AS FLOAT)) AS NUMERIC), 2)::float as "averageRating"
          FROM "Rating"
          GROUP BY "appId"
        ` as Promise<{ appId: string; averageRating: number }[]>
      ])

      // Create a map of app IDs to average ratings
      const ratingMap = new Map(
        ratings.map(r => [r.appId, Number(r.averageRating)])
      )

      // Combine apps with their average ratings and convert BigInts
      const appsWithRatings = convertBigIntToNumber(apps.map(app => ({
        ...app,
        averageRating: ratingMap.get(app.id) || 0,
      })))

      // Update cache
      adminAppsCache.data = appsWithRatings
      adminAppsCache.timestamp = Date.now()

      return appsWithRatings
    } catch (error) {
      console.error("[GET_ADMIN_APPS]", error)
      return []
    }
  }),

  getBasicUsersList: cache(async (page: number = 1, limit: number = 10) => {
    const skip = (page - 1) * limit
    const cacheKey = `users-${page}-${limit}`
    
    // Check cache first
    const cached = usersListCache.get(cacheKey)
    if (cached && isCacheValid(cached.timestamp)) {
      return cached.data
    }

    try {
      const users = await prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
          isAdmin: true,
          isBanned: true,
        },
      })

      // Update cache
      usersListCache.set(cacheKey, {
        data: users,
        timestamp: Date.now()
      })

      return users
    } catch (error) {
      console.error("[GET_BASIC_USERS]", error)
      return []
    }
  }),

  getUsersCount: cache(async () => {
    // Check cache first
    if (totalUsersCache.data !== null && isCacheValid(totalUsersCache.timestamp)) {
      return totalUsersCache.data
    }

    try {
      const count = await prisma.user.count()
      
      // Update cache
      totalUsersCache = {
        data: count,
        timestamp: Date.now()
      }

      return count
    } catch (error) {
      console.error("[GET_USERS_COUNT]", error)
      return 0
    }
  }),

  getUserStats: cache(async (userId: string) => {
    // Check cache first
    const cached = userStatsCache.get(userId)
    if (cached && isCacheValid(cached.timestamp)) {
      return cached.data
    }

    try {
      const [appsCount, activitiesCount, collectionsCount] = await Promise.all([
        prisma.app.count({
          where: {
            developer: {
              userId
            }
          }
        }),
        prisma.activityLog.count({
          where: { userId }
        }),
        prisma.collection.count({
          where: { userId }
        })
      ])

      const stats = {
        appsCount,
        activitiesCount,
        collectionsCount
      }

      // Update cache
      userStatsCache.set(userId, {
        data: stats,
        timestamp: Date.now()
      })

      return stats
    } catch (error) {
      console.error("[GET_USER_STATS]", error)
      return {
        appsCount: 0,
        activitiesCount: 0,
        collectionsCount: 0
      }
    }
  }),

  getUserActivity: cache(async (userId: string, limit: number = 5) => {
    const cacheKey = `${userId}-${limit}`
    
    // Check cache first
    const cached = userActivityCache.get(cacheKey)
    if (cached && isCacheValid(cached.timestamp)) {
      return cached.data
    }

    try {
      const activities = await prisma.activityLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })

      // Update cache
      userActivityCache.set(cacheKey, {
        data: activities,
        timestamp: Date.now()
      })

      return activities
    } catch (error) {
      console.error("[GET_USER_ACTIVITY]", error)
      return []
    }
  }),

  getDashboardStats: cache(async () => {
    // Check cache first
    if (dashboardStatsCache.data && isCacheValid(dashboardStatsCache.timestamp)) {
      return dashboardStatsCache.data
    }

    try {
      const [totalUsers, totalApps, totalDownloads, recentActivities] = await Promise.all([
        prisma.user.count(),
        prisma.app.count(),
        prisma.download.count(),
        prisma.activityLog.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        })
      ])

      const stats = {
        totalUsers,
        totalApps,
        totalDownloads,
        recentActivities
      }

      // Update cache
      dashboardStatsCache = {
        data: stats,
        timestamp: Date.now()
      }

      return stats
    } catch (error) {
      console.error("[GET_DASHBOARD_STATS]", error)
      return {
        totalUsers: 0,
        totalApps: 0,
        totalDownloads: 0,
        recentActivities: []
      }
    }
  }),

  // Cache invalidation methods
  invalidateAdminAppsCache() {
    adminAppsCache.data = null
  },

  invalidateUsersListCache() {
    usersListCache.clear()
  },

  invalidateUserStatsCache(userId?: string) {
    if (userId) {
      userStatsCache.delete(userId)
    } else {
      userStatsCache.clear()
    }
  },

  invalidateUserActivityCache(userId?: string) {
    if (userId) {
      // Clear all activity caches for this user
      for (const [key] of userActivityCache) {
        if (key.startsWith(userId)) {
          userActivityCache.delete(key)
        }
      }
    } else {
      userActivityCache.clear()
    }
  },

  invalidateTotalUsersCache() {
    totalUsersCache.data = null
  },

  invalidateDashboardStatsCache() {
    dashboardStatsCache.data = null
  }
} 