import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { subDays, startOfDay, endOfDay } from "date-fns"
import { cache } from "react"

// Cache duration for analytics (2 minutes)
const CACHE_TIME = 2 * 60 * 1000

// Cache for dashboard stats
const statsCache = new Map<number, {
  data: DashboardStats | null
  timestamp: number
}>()

// Helper to check if cache is valid
function isCacheValid(timestamp: number) {
  return Date.now() - timestamp < CACHE_TIME
}

export interface DashboardStats {
  total: {
    users: number
    apps: number
    downloads: number
    ratings: number
    comments: number
  }
  new: {
    users: number
    apps: number
    downloads: number
    ratings: number
    comments: number
  }
  categoryDistribution: {
    category: string
    count: number
  }[]
  dailyStats: {
    date: string
    downloads: number
    ratings: number
    comments: number
  }[]
}

export const getDashboardStats = cache(async (days: number = 30): Promise<DashboardStats> => {
  // Check cache first
  const cached = statsCache.get(days)
  if (cached && isCacheValid(cached.timestamp)) {
    return cached.data!
  }

  const startDate = startOfDay(subDays(new Date(), days))
  const endDate = endOfDay(new Date())

  const [
    counts,
    newCounts,
    categoryDistribution,
    dailyStats
  ] = await Promise.all([
    // Total counts - optimized to single query
    prisma.$queryRaw<[{ users: number; apps: number; downloads: number; ratings: number; comments: number }]>`
      SELECT
        (SELECT COUNT(*) FROM "User")::integer as users,
        (SELECT COUNT(*) FROM "App" WHERE "published" = true)::integer as apps,
        (SELECT COUNT(*) FROM "Download")::integer as downloads,
        (SELECT COUNT(*) FROM "Rating")::integer as ratings,
        (SELECT COUNT(*) FROM "Comment")::integer as comments
    `,

    // New counts in date range - optimized to single query
    prisma.$queryRaw<[{ users: number; apps: number; downloads: number; ratings: number; comments: number }]>`
      SELECT
        (SELECT COUNT(*) FROM "User" WHERE "createdAt" >= ${startDate}::timestamp AND "createdAt" <= ${endDate}::timestamp)::integer as users,
        (SELECT COUNT(*) FROM "App" WHERE "published" = true AND "createdAt" >= ${startDate}::timestamp AND "createdAt" <= ${endDate}::timestamp)::integer as apps,
        (SELECT COUNT(*) FROM "Download" WHERE "createdAt" >= ${startDate}::timestamp AND "createdAt" <= ${endDate}::timestamp)::integer as downloads,
        (SELECT COUNT(*) FROM "Rating" WHERE "createdAt" >= ${startDate}::timestamp AND "createdAt" <= ${endDate}::timestamp)::integer as ratings,
        (SELECT COUNT(*) FROM "Comment" WHERE "createdAt" >= ${startDate}::timestamp AND "createdAt" <= ${endDate}::timestamp)::integer as comments
    `,

    // Category distribution - optimized with materialized CTE
    prisma.$queryRaw<Array<{ category: string; count: number }>>`
      WITH MATERIALIZED category_stats AS (
        SELECT 
          c.name as category,
          COUNT(a.id)::integer as count
        FROM "App" a
        LEFT JOIN "Category" c ON c.id = a."categoryId"
        WHERE a."categoryId" IS NOT NULL
          AND a."published" = true
        GROUP BY c.name
      )
      SELECT * FROM category_stats
      ORDER BY count DESC
    `,

    // Daily stats - optimized with materialized CTEs
    prisma.$queryRaw<Array<{ date: string; downloads: number; ratings: number; comments: number }>>`
      WITH MATERIALIZED dates AS (
        SELECT generate_series(
          date_trunc('day', ${startDate}::timestamp),
          date_trunc('day', ${endDate}::timestamp),
          '1 day'::interval
        )::date as date
      ),
      MATERIALIZED daily_downloads AS (
        SELECT 
          date_trunc('day', "createdAt")::date as date,
          COUNT(*)::integer as downloads
        FROM "Download"
        WHERE "createdAt" >= ${startDate}::timestamp
        GROUP BY 1
      ),
      MATERIALIZED daily_ratings AS (
        SELECT 
          date_trunc('day', "createdAt")::date as date,
          COUNT(*)::integer as ratings
        FROM "Rating"
        WHERE "createdAt" >= ${startDate}::timestamp
        GROUP BY 1
      ),
      MATERIALIZED daily_comments AS (
        SELECT 
          date_trunc('day', "createdAt")::date as date,
          COUNT(*)::integer as comments
        FROM "Comment"
        WHERE "createdAt" >= ${startDate}::timestamp
        GROUP BY 1
      )
      SELECT 
        dates.date::text as date,
        COALESCE(daily_downloads.downloads, 0)::integer as downloads,
        COALESCE(daily_ratings.ratings, 0)::integer as ratings,
        COALESCE(daily_comments.comments, 0)::integer as comments
      FROM dates
      LEFT JOIN daily_downloads ON dates.date = daily_downloads.date
      LEFT JOIN daily_ratings ON dates.date = daily_ratings.date
      LEFT JOIN daily_comments ON dates.date = daily_comments.date
      ORDER BY dates.date ASC
    `
  ])

  const stats: DashboardStats = {
    total: counts[0],
    new: newCounts[0],
    categoryDistribution,
    dailyStats
  }

  // Update cache
  statsCache.set(days, {
    data: stats,
    timestamp: Date.now()
  })

  return stats
})

export async function count(dateRange?: { from: Date; to: Date }) {
  const where = dateRange
    ? {
        createdAt: {
          gte: dateRange.from,
          lte: dateRange.to,
        },
      }
    : {}

  const [
    totalUsers,
    totalApps,
    totalDownloads,
    totalRatings,
    totalComments,
    newUsers,
    newApps,
    newDownloads,
    newRatings,
    newComments,
  ] = await Promise.all([
    // Total counts
    prisma.user.count(),
    prisma.app.count(),
    prisma.download.count(),
    prisma.rating.count(),
    prisma.comment.count(),

    // New counts in date range
    prisma.user.count({
      where,
    }),
    prisma.app.count({
      where,
    }),
    prisma.download.count({
      where,
    }),
    prisma.rating.count({
      where,
    }),
    prisma.comment.count({
      where,
    }),
  ])

  return {
    total: {
      users: totalUsers,
      apps: totalApps,
      downloads: totalDownloads,
      ratings: totalRatings,
      comments: totalComments,
    },
    new: {
      users: newUsers,
      apps: newApps,
      downloads: newDownloads,
      ratings: newRatings,
      comments: newComments,
    },
  }
} 