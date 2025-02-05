import { prisma } from "@/lib/db"
import type { JsonValue, InputJsonValue } from "@prisma/client/runtime/library"

export interface LogActivityParams {
  userId: string
  action: "CREATE" | "UPDATE" | "DELETE" | "PUBLISH" | "UNPUBLISH" | "DOWNLOAD" | "REVIEW" | "LOGIN" | "REGISTER" | "ROLE_CHANGE"
  entityType: "USER" | "APP" | "REVIEW" | "DOWNLOAD"
  entityId: string
  details?: Record<string, unknown> | null
}

export interface GetActivityLogsParams {
  entityType?: LogActivityParams["entityType"]
  action?: LogActivityParams["action"]
  page?: number
  limit?: number
}

export async function logActivity({
  userId,
  action,
  entityType,
  entityId,
  details,
}: LogActivityParams) {
  // Ensure details is a valid JSON object
  const safeDetails = details && typeof details === 'object' 
    ? details 
    : typeof details === 'string' 
      ? JSON.parse(details) 
      : null

  return prisma.activityLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      details: safeDetails as InputJsonValue,
    },
  })
}

export async function getActivityLogs({
  entityType,
  action,
  page = 1,
  limit = 10,
}: GetActivityLogsParams = {}) {
  const where = {
    ...(entityType && { entityType }),
    ...(action && { action }),
  }

  const [total, logs] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  const pages = Math.ceil(total / limit)

  return {
    logs,
    total,
    pages,
  }
} 