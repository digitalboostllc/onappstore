import { type App } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"
import { Sql } from "@prisma/client/runtime/library"
import { Prisma } from "@prisma/client"

export type GetAppsParams = {
  search?: string
  categories?: string[]
  category?: string
  tags?: string[]
  sort?: "popular" | "recent" | "downloads" | "rating" | "all"
  price?: "free" | "paid" | "all"
  updated?: "today" | "week" | "month" | "year" | "all"
  rating?: "5" | "4" | "3" | "2" | "1" | "all"
  minRating?: number
  maxRating?: number
  minDownloads?: number
  maxDownloads?: number
  dateFrom?: Date
  dateTo?: Date
  page?: number
  limit?: number
  published?: boolean
}

export type CacheOptions = {
  revalidate?: number
}

export type AppVersion = {
  id: string
  version: string
  changelog: string | null
  createdAt: Date
  fileUrl: string
  fileSize: bigint
  sha256Hash: string
  minOsVersion: string
  _count: {
    downloads: number
  }
}

export type AppReview = {
  id: string
  rating: number
  comment: string | null
  createdAt: Date
  user: {
    name: string | null
    image: string | null
  }
}

export type AppRating = {
  id: string
  rating: number
  createdAt: Date
  userId: string
  user: {
    id: string
    name: string | null
    image: string | null
  }
}

export type AppComment = {
  id: string
  comment: string
  createdAt: Date
  parentId: string | null
  user: {
    id: string
    name: string | null
    image: string | null
  }
  replies?: AppComment[]
}

type PrismaApp = {
  id: string
  name: string
  description: string
  shortDescription: string | null
  fullContent: string | null
  icon: string | null
  website: string | null
  categoryId: string | null
  subcategoryId: string | null
  category: {
    id: string
    name: string
    parentId: string | null
    iconName: string | null
    description: string | null
  } | null
  subcategory: {
    id: string
    name: string
    parentId: string | null
    iconName: string | null
    description: string | null
  } | null
  tags: string[]
  published: boolean
  developerId: string
  createdAt: Date
  updatedAt: Date
  screenshots: string[]
  bundleIds: string[]
  downloadCount: number | null
  downloadUrl: string | null
  isBeta: boolean
  isSupported: boolean
  lastScanDate: Date | null
  license: string | null
  price: string | null
  purchaseUrl: string | null
  releaseDate: Date | null
  vendor: string | null
  fileSize: bigint | null
  version: string | null
  requirements: string | null
  otherRequirements: string | null
  developer: {
    id: string
    userId: string
    companyName: string | null
    verified: boolean
    user: {
      name: string | null
      email: string
    }
  }
  _count: {
    downloads: number
    favorites: number
    ratings: number
    comments: number
  }
  ratings: AppRating[]
  comments: AppComment[]
}

export type AppWithRatings = PrismaApp & {
  averageRating: number
}

export interface GetAppsResult {
  apps: AppWithDetails[]
  total: number
  pages: number
  currentPage: number
}

type AppWithDetails = Omit<PrismaApp, 'fileSize'> & {
  fileSize: number | null
  averageRating: number
  release_notes: string | null
  versions: {
    id: string
    version: string
    changelog: string | null
    createdAt: Date
    fileUrl: string
    fileSize: bigint
    sha256Hash: string
    minOsVersion: string
    _count: {
      downloads: number
    }
  }[]
  ratings: {
    id: string
    rating: number
    createdAt: Date
    userId: string
    user: {
      id: string
      name: string | null
      image: string | null
    }
  }[]
  comments: AppComment[]
}

export type { AppWithDetails }

export async function getApps(
  params: GetAppsParams = {},
  cacheOptions?: CacheOptions
): Promise<GetAppsResult> {
  const {
    search,
    categories,
    category,
    tags,
    sort = "recent",
    price = "all",
    updated = "all",
    rating = "all",
    minRating,
    maxRating,
    minDownloads,
    maxDownloads,
    dateFrom,
    dateTo,
    page = 1,
    limit = 10,
    published,
  } = params

  const where: any = {}
  let orderBy: any = { createdAt: "desc" }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ]
  }

  // Handle multiple categories or single category
  if (categories?.length) {
    where.OR = categories.flatMap(catId => [
      { categoryId: catId },
      { subcategoryId: catId }
    ])
  } else if (category) {
    where.OR = [
      { categoryId: category },
      { subcategoryId: category }
    ]
  }

  if (tags?.length) {
    where.tags = {
      hasSome: tags,
    }
  }

  if (published !== undefined) {
    where.published = published
  }

  // Handle price filter
  if (price === "free") {
    where.OR = [
      { price: null },
      { price: "0" }
    ]
  } else if (price === "paid") {
    where.AND = [
      { price: { not: null } },
      { price: { not: "0" } }
    ]
  }

  // Handle time/updated filter
  if (updated !== "all") {
    const now = new Date()
    let fromDate = new Date()

    switch (updated) {
      case "today":
        fromDate.setHours(0, 0, 0, 0)
        break
      case "week":
        fromDate.setDate(now.getDate() - 7)
        break
      case "month":
        fromDate.setMonth(now.getMonth() - 1)
        break
      case "year":
        fromDate.setFullYear(now.getFullYear() - 1)
        break
    }

    where.updatedAt = {
      gte: fromDate
    }
  }

  // Handle rating filter
  if (rating !== "all") {
    const minRatingValue = parseInt(rating)
    where.ratings = {
      some: {
        rating: {
          gte: minRatingValue
        }
      }
    }
  }

  // Handle sort
  switch (sort) {
    case "popular":
      orderBy = [
        {
          ratings: {
            _count: "desc"
          }
        },
        {
          createdAt: "desc"
        }
      ]
      break
    case "downloads":
      orderBy = {
        downloadCount: "desc"
      }
      break
    case "rating":
      orderBy = [
        {
          ratings: {
            _count: "desc"
          }
        },
        {
          createdAt: "desc"
        }
      ]
      break
    case "recent":
    default:
      orderBy = { createdAt: "desc" }
  }

  const skip = (page - 1) * limit

  const [apps, total] = await Promise.all([
    prisma.app.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        developer: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        category: true,
        subcategory: true,
        versions: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1,
          include: {
            _count: {
              select: {
                downloads: true
              }
            }
          }
        },
        _count: {
          select: {
            downloads: true,
            favorites: true,
            ratings: true,
            comments: true,
          },
        },
        ratings: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        comments: {
          where: {
            parentId: null,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            replies: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    }),
    prisma.app.count({ where }),
  ])

  const pages = Math.ceil(total / limit)

  return {
    apps: apps.map((app): AppWithDetails => ({
      ...app,
      fileSize: app.fileSize ? Number(app.fileSize.toString()) : null,
      averageRating: app.ratings.length
        ? app.ratings.reduce((acc, curr) => acc + curr.rating, 0) / app.ratings.length
        : 0,
      release_notes: app.versions?.[0]?.changelog || null,
      versions: app.versions.map((version) => ({
        id: version.id,
        version: version.version,
        changelog: version.changelog,
        createdAt: version.createdAt,
        fileUrl: version.fileUrl,
        fileSize: version.fileSize,
        sha256Hash: version.sha256Hash,
        minOsVersion: version.minOsVersion,
        _count: {
          downloads: version._count.downloads,
        },
      })),
      ratings: app.ratings.map((rating) => ({
        id: rating.id,
        rating: rating.rating,
        createdAt: rating.createdAt,
        userId: rating.user.id,
        user: {
          id: rating.user.id,
          name: rating.user.name,
          image: rating.user.image,
        },
      })),
      comments: app.comments.map((comment) => ({
        id: comment.id,
        comment: comment.comment,
        createdAt: comment.createdAt,
        parentId: comment.parentId,
        user: {
          id: comment.user.id,
          name: comment.user.name,
          image: comment.user.image,
        },
        replies: comment.replies?.map((reply) => ({
          id: reply.id,
          comment: reply.comment,
          createdAt: reply.createdAt,
          parentId: reply.parentId,
          user: {
            id: reply.user.id,
            name: reply.user.name,
            image: reply.user.image,
          }
        }))
      }))
    })),
    total,
    pages,
    currentPage: page,
  }
}

export async function getApp(id: string): Promise<AppWithDetails | null> {
  const app = await prisma.app.findUnique({
    where: { id },
    include: {
      developer: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      category: true,
      subcategory: true,
      versions: {
        orderBy: {
          createdAt: 'desc'
        },
        take: 1,
        include: {
          _count: {
            select: {
              downloads: true
            }
          }
        }
      },
      _count: {
        select: {
          downloads: true,
          favorites: true,
          ratings: true,
          comments: true,
        },
      },
      ratings: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
      comments: {
        where: {
          parentId: null,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          replies: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  })

  if (!app) {
    return null
  }

  // Calculate average rating
  const avgRating = await prisma.$queryRaw<[{ averageRating: number }]>(
    Prisma.sql`
      SELECT ROUND(CAST(AVG(rating) AS NUMERIC), 2)::float as "averageRating"
      FROM "Rating"
      WHERE "appId" = ${id}
    `
  )

  const appDetails: AppWithDetails = {
    ...app,
    fileSize: app.fileSize ? Number(app.fileSize.toString()) : null,
    averageRating: avgRating[0]?.averageRating || 0,
    release_notes: app.versions?.[0]?.changelog || null,
    versions: app.versions.map((version) => ({
      id: version.id,
      version: version.version,
      changelog: version.changelog,
      createdAt: version.createdAt,
      fileUrl: version.fileUrl,
      fileSize: version.fileSize,
      sha256Hash: version.sha256Hash,
      minOsVersion: version.minOsVersion,
      _count: {
        downloads: version._count.downloads,
      },
    })),
    ratings: app.ratings.map((rating) => ({
      id: rating.id,
      rating: rating.rating,
      createdAt: rating.createdAt,
      userId: rating.user.id,
      user: {
        id: rating.user.id,
        name: rating.user.name,
        image: rating.user.image,
      },
    })),
    comments: app.comments.map((comment) => ({
      id: comment.id,
      comment: comment.comment,
      createdAt: comment.createdAt,
      parentId: comment.parentId,
      user: {
        id: comment.user.id,
        name: comment.user.name,
        image: comment.user.image,
      },
      replies: comment.replies?.map((reply) => ({
        id: reply.id,
        comment: reply.comment,
        createdAt: reply.createdAt,
        parentId: reply.parentId,
        user: {
          id: reply.user.id,
          name: reply.user.name,
          image: reply.user.image,
        }
      }))
    }))
  }

  return appDetails
}

export async function getSimilarApps(id: string, limit = 4) {
  const app = await prisma.app.findUnique({
    where: { id },
    select: {
      categoryId: true,
      subcategoryId: true,
      tags: true,
    },
  })

  if (!app) return []

  const similarApps = await prisma.app.findMany({
    where: {
      published: true,
      NOT: {
        id,
      },
      OR: [
        {
          categoryId: app.categoryId,
        },
        {
          subcategoryId: app.subcategoryId,
        },
        {
          tags: {
            hasSome: app.tags,
          },
        },
      ],
    },
    take: limit,
    include: {
      developer: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      category: true,
      subcategory: true,
      ratings: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
      comments: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
      _count: {
        select: {
          ratings: true,
          downloads: true,
          favorites: true,
          comments: true,
        },
      },
    },
  })

  return similarApps.map(app => ({
    ...app,
    averageRating: app.ratings.length > 0
      ? app.ratings.reduce((acc, curr) => acc + curr.rating, 0) / app.ratings.length
      : 0,
    fileSize: app.fileSize ? Number(app.fileSize) : null,
  }))
}

export async function getPopularTags(limit = 10): Promise<{ tag: string; count: number }[]> {
  const apps = await prisma.app.findMany({
    where: {
      published: true,
    },
    select: {
      tags: true,
    },
  })

  const tagCounts = apps.reduce((acc: Record<string, number>, app: { tags: string[] }) => {
    app.tags.forEach((tag: string) => {
      acc[tag] = (acc[tag] || 0) + 1
    })
    return acc
  }, {})

  return Object.entries(tagCounts)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count: count as number }))
} 