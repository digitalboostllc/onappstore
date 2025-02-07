import { prisma } from "@/lib/prisma"
import { cache } from "react"

// Basic user list with minimal data (cached)
export const getBasicUsersList = cache(async (page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit
  
  return prisma.user.findMany({
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
})

// Get total users count (cached)
export const getUsersCount = cache(async () => {
  return prisma.user.count()
})

// Get user stats separately
export async function getUserStats(userId: string) {
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

  return {
    appsCount,
    activitiesCount,
    collectionsCount
  }
}

// Get user activity logs
export async function getUserActivity(userId: string, limit: number = 5) {
  return prisma.activityLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

// Get admin dashboard stats (cached)
export const getDashboardStats = cache(async () => {
  const [
    totalUsers,
    totalApps,
    totalDownloads,
    recentActivities
  ] = await Promise.all([
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

  return {
    totalUsers,
    totalApps,
    totalDownloads,
    recentActivities
  }
}) 