import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { AdminHeader } from "@/components/admin/header"
import { AdminTabs } from "@/components/admin/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Overview } from "@/components/admin/analytics/overview"
import { TopApps } from "@/components/admin/analytics/top-apps"
import { DownloadStats } from "@/components/admin/analytics/download-stats"
import { UserStats } from "@/components/admin/analytics/user-stats"
import type { Download as PrismaDownload } from "@prisma/client"

interface DownloadWithApp extends PrismaDownload {
  app: {
    id: string
    name: string
    categoryId: string
  }
}

interface User {
  createdAt: Date
}

interface TopApp {
  id: string
  name: string
  _count: {
    downloads: number
  }
}

interface ChartUser {
  date: string
  total: number
}

export default async function AnalyticsPage() {
  const user = await getCurrentUser()

  if (!user?.isAdmin) {
    redirect("/")
  }

  // Get analytics data for the last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const downloads = await prisma.download.findMany({
    where: {
      createdAt: {
        gte: thirtyDaysAgo,
      },
    },
    include: {
      app: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  }) as DownloadWithApp[]

  const users = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: thirtyDaysAgo,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  }) as User[]

  const topApps = await prisma.app.findMany({
    include: {
      _count: {
        select: {
          downloads: true,
        },
      },
    },
    orderBy: {
      downloads: {
        _count: "desc",
      },
    },
    take: 5,
  }) as TopApp[]

  // Format downloads data for charts
  const downloadsByDate = downloads.reduce((acc: Record<string, number>, download: DownloadWithApp) => {
    const date = new Date(download.createdAt).toLocaleDateString()
    acc[date] = (acc[date] || 0) + 1
    return acc
  }, {})

  const downloadData = Object.entries(downloadsByDate)
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([date, count]) => ({ date, count: count as number }))

  // Format users data for charts
  const usersByDate = users.reduce((acc: Record<string, number>, user: User) => {
    const date = new Date(user.createdAt).toLocaleDateString()
    acc[date] = (acc[date] || 0) + 1
    return acc
  }, {})

  const userData = Object.entries(usersByDate)
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .reduce((acc: ChartUser[], [date, count], index) => {
      const previousTotal = index > 0 ? acc[index - 1].total : 0
      acc.push({
        date,
        total: previousTotal + count,
      })
      return acc
    }, [])

  // Format top apps data
  const formattedTopApps = topApps.map((app: TopApp) => ({
    id: app.id,
    name: app.name,
    downloads: app._count.downloads
  }))

  // Format downloads for stats
  const formattedDownloads = downloads.map((download: DownloadWithApp) => ({
    category: download.app.categoryId,
    platform: "unknown" // We don't have userAgent in the schema
  }))

  return (
    <div className="container space-y-8 py-8">
      <AdminHeader />
      <AdminTabs />
      <div className="grid gap-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Downloads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {downloads.length.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Last 30 days
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                New Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.length.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Last 30 days
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Active Apps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {topApps.length.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                With downloads
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Conversion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {((downloads.length / users.length || 0) * 100).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Downloads per user
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <Overview downloads={downloadData} />
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Top Apps</CardTitle>
              <CardDescription>
                Most downloaded applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TopApps apps={formattedTopApps} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Download Statistics</CardTitle>
              <CardDescription>
                Downloads by category and platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DownloadStats downloads={formattedDownloads} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>User Statistics</CardTitle>
              <CardDescription>
                User growth and engagement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserStats users={userData} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function getPlatform(userAgent: string): string {
  const ua = userAgent.toLowerCase()
  if (ua.includes("mac")) return "macOS"
  if (ua.includes("windows")) return "Windows"
  if (ua.includes("linux")) return "Linux"
  return "Other"
} 