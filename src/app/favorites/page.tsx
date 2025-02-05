import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { AppGrid } from "@/components/apps/app-grid"
import { PageHeader } from "@/components/page-header"

export default async function FavoritesPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    include: {
      app: {
        include: {
          developer: {
            include: {
              user: {
                select: {
                  name: true,
                  image: true,
                  email: true,
                },
              },
            },
          },
          category: true,
          subcategory: true,
          versions: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
            include: {
              _count: {
                select: {
                  downloads: true,
                },
              },
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
            orderBy: {
              createdAt: "desc",
            },
            take: 5,
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
            orderBy: {
              createdAt: "desc",
            },
            take: 5,
          },
          _count: {
            select: {
              ratings: true,
              favorites: true,
              downloads: true,
              comments: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  const apps = favorites.map((favorite) => {
    const app = favorite.app
    const ratings = app.ratings.map(r => r.rating)
    const averageRating = ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : 0

    return {
      ...app,
      averageRating,
      release_notes: app.versions[0]?.changelog || null,
      fileSize: app.fileSize ? Number(app.fileSize) : null
    }
  })

  return (
    <div className="container py-8 space-y-8">
      <PageHeader>
        <PageHeader.Title>Favorite Apps</PageHeader.Title>
        <PageHeader.Description>
          Your collection of favorite applications.
        </PageHeader.Description>
      </PageHeader>

      <AppGrid
        apps={apps}
        total={apps.length}
        pages={1}
        currentPage={1}
      />
    </div>
  )
} 