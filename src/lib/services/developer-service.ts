import { prisma } from "@/lib/prisma"
import { cache } from "react"

// Get basic developer info and apps (cached)
export const getDeveloperWithBasicApps = cache(async (userId: string) => {
  return prisma.developer.findUnique({
    where: { userId },
    include: {
      apps: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          published: true,
          updatedAt: true,
        },
      },
    },
  })
})

// Get app stats separately
export async function getAppStats(appId: string) {
  const [versions, counts] = await Promise.all([
    prisma.version.findMany({
      where: { appId },
      orderBy: { createdAt: "desc" },
      take: 1,
      include: {
        _count: {
          select: {
            downloads: true,
          },
        },
      },
    }),
    prisma.app.findUnique({
      where: { id: appId },
      select: {
        _count: {
          select: {
            ratings: true,
          },
        },
      },
    }),
  ])

  return {
    latestVersion: versions[0] || null,
    ratings: counts?._count.ratings || 0,
  }
}

// Create developer profile
export async function createDeveloper(userId: string) {
  return prisma.developer.create({
    data: { userId },
    include: {
      apps: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          published: true,
          updatedAt: true,
        },
      },
    },
  })
}

// Get detailed app versions
export async function getAppVersions(appId: string) {
  return prisma.version.findMany({
    where: { appId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          downloads: true,
        },
      },
    },
  })
} 