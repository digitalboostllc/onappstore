import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { cache } from "react"

// Cache duration (5 minutes)
const CACHE_TIME = 5 * 60 * 1000

// Cache for users list
const usersListCache = new Map<string, {
  data: any
  timestamp: number
}>()

// Cache for user details
const userDetailsCache = new Map<string, {
  data: any
  timestamp: number
}>()

// Helper to check if cache is valid
function isCacheValid(timestamp: number) {
  return Date.now() - timestamp < CACHE_TIME
}

// Helper to generate cache key for users list
function getUsersListCacheKey(params: GetUsersParams): string {
  return JSON.stringify({
    search: params.search || "",
    role: params.role || "",
    status: params.status || "",
    sort: params.sort || "newest",
    page: params.page || 1,
    limit: params.limit || 10,
  })
}

export interface GetUsersParams {
  search?: string
  role?: "admin" | "user"
  status?: "active" | "banned"
  sort?: "newest" | "oldest"
  page?: number
  limit?: number
}

export interface UserWithCounts {
  id: string
  name: string | null
  email: string
  isAdmin: boolean
  isBanned: boolean
  createdAt: Date
  developer: {
    _count: {
      apps: number
    }
  } | null
  _count: {
    downloads: number
    reviews: number
  }
}

// Optimized user select
const userSelect = {
  id: true,
  name: true,
  email: true,
  isAdmin: true,
  isBanned: true,
  createdAt: true,
  developer: {
    select: {
      _count: {
        select: {
          apps: true,
        },
      },
    },
  },
  _count: {
    select: {
      downloads: true,
      ratings: true,
    },
  },
} as const satisfies Prisma.UserSelect

export const getUsers = cache(async ({
  search,
  role,
  status,
  sort = "newest",
  page = 1,
  limit = 10,
}: GetUsersParams = {}): Promise<{
  users: UserWithCounts[]
  total: number
  pages: number
}> => {
  // Check cache first
  const cacheKey = getUsersListCacheKey({ search, role, status, sort, page, limit })
  const cached = usersListCache.get(cacheKey)
  if (cached && isCacheValid(cached.timestamp)) {
    return cached.data
  }

  const where = {
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(role === "admin" && { isAdmin: true }),
    ...(role === "user" && { isAdmin: false }),
    ...(status === "banned" && { isBanned: true }),
    ...(status === "active" && { isBanned: false }),
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: {
        createdAt: sort === "newest" ? "desc" : "asc",
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  const pages = Math.ceil(total / limit)

  // Transform ratings to reviews in the response
  const transformedUsers = users.map(user => ({
    ...user,
    _count: {
      ...user._count,
      reviews: user._count.ratings,
    },
  }))

  const result = {
    users: transformedUsers as UserWithCounts[],
    total,
    pages,
  }

  // Update cache
  usersListCache.set(cacheKey, {
    data: result,
    timestamp: Date.now(),
  })

  return result
})

export const getUserById = cache(async (id: string): Promise<UserWithCounts | null> => {
  // Check cache first
  const cached = userDetailsCache.get(id)
  if (cached && isCacheValid(cached.timestamp)) {
    return cached.data
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: userSelect,
  })

  if (!user) {
    return null
  }

  const transformedUser = {
    ...user,
    _count: {
      ...user._count,
      reviews: user._count.ratings,
    },
  } as UserWithCounts

  // Update cache
  userDetailsCache.set(id, {
    data: transformedUser,
    timestamp: Date.now(),
  })

  return transformedUser
})

export const updateUser = async (
  id: string,
  data: {
    name?: string
    email?: string
    isAdmin?: boolean
    isBanned?: boolean
  }
) => {
  const user = await prisma.user.update({
    where: { id },
    data,
    select: userSelect,
  })

  // Invalidate caches
  userDetailsCache.delete(id)
  usersListCache.clear() // Clear all list caches as this update might affect any list

  return user
}

export const deleteUser = async (id: string) => {
  const user = await prisma.user.delete({
    where: { id },
  })

  // Invalidate caches
  userDetailsCache.delete(id)
  usersListCache.clear() // Clear all list caches

  return user
}

export async function resetUserPassword(userId: string) {
  // In a real app, you would:
  // 1. Generate a password reset token
  // 2. Send an email to the user with a reset link
  // 3. Create an API endpoint to handle the reset
  throw new Error("Not implemented")
} 