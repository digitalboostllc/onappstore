import { prisma } from "@/lib/prisma"
import { cache } from "react"
import type { Collection, CollectionApp, App } from "@prisma/client"

// Cache duration (5 minutes)
const CACHE_TIME = 5 * 60 * 1000

// Cache for collections
const collectionCache = new Map<string, {
  data: any
  timestamp: number
}>()

// Cache for user collections
const userCollectionsCache = new Map<string, {
  data: any[]
  timestamp: number
}>()

// Cache for public collections
let publicCollectionsCache: {
  data: any[] | null
  timestamp: number
} = {
  data: null,
  timestamp: 0
}

// Helper to check if cache is valid
function isCacheValid(timestamp: number) {
  return Date.now() - timestamp < CACHE_TIME
}

// Optimized collection select
const collectionSelect = {
  id: true,
  name: true,
  description: true,
  isPublic: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  apps: {
    include: {
      app: {
        select: {
          id: true,
          name: true,
          description: true,
          icon: true,
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          developer: {
            select: {
              id: true,
              companyName: true,
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
          _count: {
            select: {
              ratings: true,
              downloads: true,
            },
          },
        },
      },
    },
  },
  _count: {
    select: {
      apps: true,
    },
  },
} as const

export type CollectionWithApps = Collection & {
  apps: (CollectionApp & {
    app: App
  })[]
  _count?: {
    apps: number
  }
}

export const collectionService = {
  async createCollection(userId: string, data: { name: string; description?: string; isPublic?: boolean }) {
    const collection = await prisma.collection.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        isPublic: data.isPublic,
      },
      include: {
        _count: {
          select: {
            apps: true,
          },
        },
      },
    })

    // Invalidate user collections cache
    userCollectionsCache.delete(userId)
    if (collection.isPublic) {
      publicCollectionsCache.data = null
    }

    return collection
  },

  async getCollection(id: string) {
    // Check cache first
    const cached = collectionCache.get(id)
    if (cached && isCacheValid(cached.timestamp)) {
      return cached.data
    }

    const collection = await prisma.collection.findUnique({
      where: { id },
      select: collectionSelect,
    })

    if (collection) {
      // Update cache
      collectionCache.set(id, {
        data: collection,
        timestamp: Date.now(),
      })
    }

    return collection
  },

  async getUserCollections(userId: string) {
    // Check cache first
    const cached = userCollectionsCache.get(userId)
    if (cached && isCacheValid(cached.timestamp)) {
      return cached.data
    }

    const collections = await prisma.collection.findMany({
      where: { userId },
      select: collectionSelect,
      orderBy: {
        updatedAt: "desc",
      },
    })

    // Update cache
    userCollectionsCache.set(userId, {
      data: collections,
      timestamp: Date.now(),
    })

    return collections
  },

  async getPublicCollections() {
    // Check cache first
    if (publicCollectionsCache.data && isCacheValid(publicCollectionsCache.timestamp)) {
      return publicCollectionsCache.data
    }

    const collections = await prisma.collection.findMany({
      where: { isPublic: true },
      select: collectionSelect,
      orderBy: {
        updatedAt: "desc",
      },
    })

    // Update cache
    publicCollectionsCache = {
      data: collections,
      timestamp: Date.now(),
    }

    return collections
  },

  async addAppToCollection(collectionId: string, appId: string) {
    const result = await prisma.collectionApp.create({
      data: {
        collectionId,
        appId,
      },
    })

    // Invalidate relevant caches
    collectionCache.delete(collectionId)
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      select: { userId: true, isPublic: true },
    })
    if (collection) {
      userCollectionsCache.delete(collection.userId)
      if (collection.isPublic) {
        publicCollectionsCache.data = null
      }
    }

    return result
  },

  async removeAppFromCollection(collectionId: string, appId: string) {
    const result = await prisma.collectionApp.delete({
      where: {
        collectionId_appId: {
          collectionId,
          appId,
        },
      },
    })

    // Invalidate relevant caches
    collectionCache.delete(collectionId)
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      select: { userId: true, isPublic: true },
    })
    if (collection) {
      userCollectionsCache.delete(collection.userId)
      if (collection.isPublic) {
        publicCollectionsCache.data = null
      }
    }

    return result
  },

  async updateCollection(id: string, data: { name?: string; description?: string; isPublic?: boolean }) {
    const result = await prisma.collection.update({
      where: { id },
      data,
      include: {
        _count: {
          select: {
            apps: true,
          },
        },
      },
    })

    // Invalidate relevant caches
    collectionCache.delete(id)
    userCollectionsCache.delete(result.userId)
    if (result.isPublic) {
      publicCollectionsCache.data = null
    }

    return result
  },

  async deleteCollection(id: string) {
    const result = await prisma.collection.delete({
      where: { id },
    })

    // Invalidate relevant caches
    collectionCache.delete(id)
    userCollectionsCache.delete(result.userId)
    if (result.isPublic) {
      publicCollectionsCache.data = null
    }

    return result
  },
} 