import { prisma } from "@/lib/prisma"
import { cache } from "react"
import type { Comment, User } from "@prisma/client"

// Cache duration (2 minutes for comments)
const CACHE_TIME = 2 * 60 * 1000

// Cache for app comments
const commentsCache = new Map<string, {
  data: any[]
  timestamp: number
}>()

// Helper to check if cache is valid
function isCacheValid(timestamp: number) {
  return Date.now() - timestamp < CACHE_TIME
}

export interface CommentWithUser extends Comment {
  user: Pick<User, "id" | "name" | "image">
  replies?: CommentWithUser[]
  _count?: {
    replies: number
  }
}

export const commentsService = {
  getAppComments: cache(async (appId: string): Promise<CommentWithUser[]> => {
    // Check cache first
    const cached = commentsCache.get(appId)
    if (cached && isCacheValid(cached.timestamp)) {
      return cached.data
    }

    try {
      const comments = await prisma.comment.findMany({
        where: {
          appId,
          parentId: null,
          isHidden: false
        },
        orderBy: {
          createdAt: "desc"
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true
            }
          },
          replies: {
            where: {
              isHidden: false
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true
                }
              }
            },
            orderBy: {
              createdAt: "asc"
            }
          },
          _count: {
            select: {
              replies: true
            }
          }
        }
      })

      // Update cache
      commentsCache.set(appId, {
        data: comments,
        timestamp: Date.now()
      })

      return comments
    } catch (error) {
      console.error("[GET_APP_COMMENTS]", error)
      return []
    }
  }),

  createComment: async (data: {
    appId: string
    userId: string
    comment: string
    parentId?: string
  }) => {
    try {
      const newComment = await prisma.comment.create({
        data: {
          appId: data.appId,
          userId: data.userId,
          comment: data.comment,
          parentId: data.parentId
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        }
      })

      // Invalidate cache for this app's comments
      commentsCache.delete(data.appId)

      return newComment
    } catch (error) {
      console.error("[CREATE_COMMENT]", error)
      throw error
    }
  },

  updateComment: async (id: string, userId: string, comment: string) => {
    try {
      const updatedComment = await prisma.comment.update({
        where: {
          id,
          userId // Ensure user owns the comment
        },
        data: { comment },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        }
      })

      // Invalidate cache for this app's comments
      commentsCache.delete(updatedComment.appId)

      return updatedComment
    } catch (error) {
      console.error("[UPDATE_COMMENT]", error)
      throw error
    }
  },

  deleteComment: async (id: string, userId: string) => {
    try {
      const comment = await prisma.comment.delete({
        where: {
          id,
          userId // Ensure user owns the comment
        }
      })

      // Invalidate cache for this app's comments
      commentsCache.delete(comment.appId)

      return comment
    } catch (error) {
      console.error("[DELETE_COMMENT]", error)
      throw error
    }
  },

  // Admin methods
  getAllComments: cache(async () => {
    try {
      const comments = await prisma.comment.findMany({
        orderBy: {
          createdAt: "desc"
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          app: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      return comments
    } catch (error) {
      console.error("[GET_ALL_COMMENTS]", error)
      return []
    }
  }),

  // Cache invalidation method
  invalidateCommentsCache(appId?: string) {
    if (appId) {
      commentsCache.delete(appId)
    } else {
      commentsCache.clear()
    }
  }
} 