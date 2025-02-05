import { prisma } from "@/lib/db"
import { Prisma } from "@prisma/client"

export interface GetUsersParams {
  search?: string
  role?: "admin" | "user"
  status?: "active" | "banned"
  sort?: "newest" | "oldest"
  page?: number
  limit?: number
}

export interface UpdateUserData {
  isAdmin?: boolean
  isBanned?: boolean
}

interface UserWithCounts {
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
} satisfies Prisma.UserSelect

export async function getUsers({
  search,
  role,
  status,
  sort = "newest",
  page = 1,
  limit = 10,
}: GetUsersParams = {}) {
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

  return {
    users: transformedUsers as unknown as UserWithCounts[],
    total,
    pages,
  }
}

export async function updateUser(userId: string, data: UpdateUserData) {
  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: userSelect,
  })

  return {
    ...user,
    _count: {
      ...user._count,
      reviews: user._count.ratings,
    },
  } as unknown as UserWithCounts
}

export async function resetUserPassword(userId: string) {
  // In a real app, you would:
  // 1. Generate a password reset token
  // 2. Send an email to the user with a reset link
  // 3. Create an API endpoint to handle the reset
  throw new Error("Not implemented")
}

export async function deleteUser(userId: string) {
  return prisma.user.delete({
    where: { id: userId },
  })
} 