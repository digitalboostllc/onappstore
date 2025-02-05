import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

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
    return prisma.notification.create({
      data: {
        ...data,
        userId,
      },
    })
  },

  async markAsRead(id: string, userId: string) {
    return prisma.notification.update({
      where: { id, userId },
      data: { read: true },
    })
  },

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    })
  },

  async deleteNotification(id: string, userId: string) {
    return prisma.notification.delete({
      where: { id, userId },
    })
  },

  async getUserNotifications(userId: string, { page = 1, limit = 10 } = {}) {
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

    return {
      notifications,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }
  },

  async getUnreadCount(userId: string) {
    return prisma.notification.count({
      where: { userId, read: false },
    })
  },

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
} 