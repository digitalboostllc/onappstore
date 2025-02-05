import { prisma } from "@/lib/prisma"
import type { Collection, CollectionApp, App } from "@prisma/client"

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
    return prisma.collection.create({
      data: {
        ...data,
        userId,
      },
    })
  },

  async updateCollection(
    id: string,
    userId: string,
    data: { name?: string; description?: string; isPublic?: boolean }
  ) {
    return prisma.collection.update({
      where: { id, userId },
      data,
    })
  },

  async deleteCollection(id: string, userId: string) {
    return prisma.collection.delete({
      where: { id, userId },
    })
  },

  async getCollection(id: string) {
    return prisma.collection.findUnique({
      where: { id },
      include: {
        apps: {
          include: {
            app: true,
          },
        },
        _count: {
          select: {
            apps: true,
          },
        },
      },
    })
  },

  async getUserCollections(userId: string) {
    return prisma.collection.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            apps: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    })
  },

  async getPublicCollections() {
    return prisma.collection.findMany({
      where: { isPublic: true },
      include: {
        _count: {
          select: {
            apps: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    })
  },

  async addAppToCollection(collectionId: string, userId: string, appId: string) {
    // First verify the collection belongs to the user
    const collection = await prisma.collection.findFirst({
      where: { id: collectionId, userId },
    })

    if (!collection) {
      throw new Error("Collection not found or access denied")
    }

    return prisma.collectionApp.create({
      data: {
        collectionId,
        appId,
      },
    })
  },

  async removeAppFromCollection(collectionId: string, userId: string, appId: string) {
    // First verify the collection belongs to the user
    const collection = await prisma.collection.findFirst({
      where: { id: collectionId, userId },
    })

    if (!collection) {
      throw new Error("Collection not found or access denied")
    }

    return prisma.collectionApp.delete({
      where: {
        collectionId_appId: {
          collectionId,
          appId,
        },
      },
    })
  },
} 