import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { subDays, startOfDay, endOfDay } from "date-fns"

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

export async function getDashboardStats(days: number = 30): Promise<DashboardStats> {
  const startDate = startOfDay(subDays(new Date(), days))
  const endDate = endOfDay(new Date())

  const [
    counts,
    newCounts,
    categoryDistribution,
    dailyStats
  ] = await Promise.all([
    // Total counts
    prisma.$queryRaw`
      SELECT
        (SELECT COUNT(*) FROM "User")::integer as users,
        (SELECT COUNT(*) FROM "App")::integer as apps,
        (SELECT COUNT(*) FROM "Download")::integer as downloads,
        (SELECT COUNT(*) FROM "Rating")::integer as ratings,
        (SELECT COUNT(*) FROM "Comment")::integer as comments
    `,

    // New counts in date range
    prisma.$queryRaw`
      SELECT
        (SELECT COUNT(*) FROM "User" WHERE "createdAt" >= ${startDate}::timestamp AND "createdAt" <= ${endDate}::timestamp)::integer as users,
        (SELECT COUNT(*) FROM "App" WHERE "createdAt" >= ${startDate}::timestamp AND "createdAt" <= ${endDate}::timestamp)::integer as apps,
        (SELECT COUNT(*) FROM "Download" WHERE "createdAt" >= ${startDate}::timestamp AND "createdAt" <= ${endDate}::timestamp)::integer as downloads,
        (SELECT COUNT(*) FROM "Rating" WHERE "createdAt" >= ${startDate}::timestamp AND "createdAt" <= ${endDate}::timestamp)::integer as ratings,
        (SELECT COUNT(*) FROM "Comment" WHERE "createdAt" >= ${startDate}::timestamp AND "createdAt" <= ${endDate}::timestamp)::integer as comments
    `,

    // Category distribution
    prisma.$queryRaw<Array<{ category: string, count: number }>>`
      SELECT 
        COALESCE(c.name, 'Uncategorized') as category,
        COUNT(a.id)::integer as count
      FROM "App" a
      LEFT JOIN "Category" c ON c.id = a."categoryId"
      WHERE a."categoryId" IS NOT NULL
      GROUP BY c.name
      ORDER BY count DESC
    `,

    // Daily stats using PostgreSQL syntax
    prisma.$queryRaw`
      WITH dates AS (
        SELECT generate_series(
          date_trunc('day', ${startDate}::timestamp),
          date_trunc('day', ${endDate}::timestamp),
          '1 day'::interval
        )::date as date
      ),
      daily_downloads AS (
        SELECT 
          date_trunc('day', "createdAt")::date as date,
          COUNT(*)::integer as downloads
        FROM "Download"
        WHERE "createdAt" >= ${startDate}::timestamp
        GROUP BY 1
      ),
      daily_ratings AS (
        SELECT 
          date_trunc('day', "createdAt")::date as date,
          COUNT(*)::integer as ratings
        FROM "Rating"
        WHERE "createdAt" >= ${startDate}::timestamp
        GROUP BY 1
      ),
      daily_comments AS (
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

  const totalCounts = (counts as any[])[0]
  const newCounts_ = (newCounts as any[])[0]

  return {
    total: {
      users: Number(totalCounts.users),
      apps: Number(totalCounts.apps),
      downloads: Number(totalCounts.downloads),
      ratings: Number(totalCounts.ratings),
      comments: Number(totalCounts.comments),
    },
    new: {
      users: Number(newCounts_.users),
      apps: Number(newCounts_.apps),
      downloads: Number(newCounts_.downloads),
      ratings: Number(newCounts_.ratings),
      comments: Number(newCounts_.comments),
    },
    categoryDistribution: categoryDistribution,
    dailyStats: (dailyStats as any[]).map(stat => ({
      date: stat.date,
      downloads: Number(stat.downloads),
      ratings: Number(stat.ratings),
      comments: Number(stat.comments)
    }))
  }
}

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