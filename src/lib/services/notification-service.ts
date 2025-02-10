import { prisma } from "@/lib/prisma"
import { cache } from "react"
import type { Notification } from "@prisma/client"

// Cache duration (1 minute for notifications)
const CACHE_TIME = 60 * 1000

// Cache for user notifications
const notificationsCache = new Map<string, {
  data: {
    notifications: Notification[]
    total: number
    page: number
    totalPages: number
  }
  timestamp: number
}>()

// Cache for unread counts
const unreadCountCache = new Map<string, {
  data: number
  timestamp: number
}>()

// Helper to check if cache is valid
function isCacheValid(timestamp: number) {
  return Date.now() - timestamp < CACHE_TIME
}

// Helper to generate cache key
function getNotificationsCacheKey(userId: string, page: number, limit: number): string {
  return `${userId}-${page}-${limit}`
}

export type NotificationType = "APP_UPDATE" | "REVIEW" | "SYSTEM"

export const notificationService = {
  async createNotification(
    userId: string,
    data: {
      type: NotificationType
      title: string
      message: string
      data?: Record<string, any>
    }
  ) {
    const notification = await prisma.notification.create({
      data: {
        ...data,
        userId,
      },
    })

    // Invalidate caches for this user
    this.invalidateUserCaches(userId)

    return notification
  },

  async markAsRead(id: string, userId: string) {
    const notification = await prisma.notification.update({
      where: { id, userId },
      data: { read: true },
    })

    // Invalidate caches for this user
    this.invalidateUserCaches(userId)

    return notification
  },

  async markAllAsRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    })

    // Invalidate caches for this user
    this.invalidateUserCaches(userId)

    return result
  },

  async deleteNotification(id: string, userId: string) {
    const notification = await prisma.notification.delete({
      where: { id, userId },
    })

    // Invalidate caches for this user
    this.invalidateUserCaches(userId)

    return notification
  },

  getUserNotifications: cache(async (userId: string, { page = 1, limit = 10 } = {}) => {
    // Check cache first
    const cacheKey = getNotificationsCacheKey(userId, page, limit)
    const cached = notificationsCache.get(cacheKey)
    if (cached && isCacheValid(cached.timestamp)) {
      return cached.data
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({
        where: { userId },
      }),
    ])

    const result = {
      notifications,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }

    // Update cache
    notificationsCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    })

    return result
  }),

  getUnreadCount: cache(async (userId: string) => {
    // Check cache first
    const cached = unreadCountCache.get(userId)
    if (cached && isCacheValid(cached.timestamp)) {
      return cached.data
    }

    const count = await prisma.notification.count({
      where: { userId, read: false },
    })

    // Update cache
    unreadCountCache.set(userId, {
      data: count,
      timestamp: Date.now(),
    })

    return count
  }),

  // Helper methods for creating specific types of notifications
  async notifyAppUpdate(userId: string, appName: string, version: string) {
    return this.createNotification(userId, {
      type: "APP_UPDATE",
      title: "App Update Available",
      message: `${appName} has been updated to version ${version}`,
      data: { appName, version },
    })
  },

  async notifyNewReview(userId: string, appName: string, reviewer: string) {
    return this.createNotification(userId, {
      type: "REVIEW",
      title: "New App Review",
      message: `${reviewer} left a review on ${appName}`,
      data: { appName, reviewer },
    })
  },

  async notifySystem(userId: string, title: string, message: string) {
    return this.createNotification(userId, {
      type: "SYSTEM",
      title,
      message,
    })
  },

  // Cache invalidation methods
  invalidateUserCaches(userId: string) {
    // Clear all notification caches for this user
    for (const [key] of notificationsCache) {
      if (key.startsWith(userId)) {
        notificationsCache.delete(key)
      }
    }
    // Clear unread count cache
    unreadCountCache.delete(userId)
  }
} 