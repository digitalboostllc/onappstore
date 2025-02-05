"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, PackageSearch, Download, Star } from "lucide-react"

interface StatsCardsProps {
  totalUsers: number
  totalApps: number
  totalDownloads: number
  totalReviews: number
  newUsers: number
  newApps: number
  newDownloads: number
}

export function StatsCards({
  totalUsers,
  totalApps,
  totalDownloads,
  totalReviews,
  newUsers,
  newApps,
  newDownloads,
}: StatsCardsProps) {
  const stats = [
    {
      title: "Total Users",
      value: totalUsers,
      newValue: newUsers,
      icon: Users,
    },
    {
      title: "Total Apps",
      value: totalApps,
      newValue: newApps,
      icon: PackageSearch,
    },
    {
      title: "Total Downloads",
      value: totalDownloads,
      newValue: newDownloads,
      icon: Download,
    },
    {
      title: "Total Reviews",
      value: totalReviews,
      icon: Star,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
            {stat.newValue !== undefined && (
              <p className="text-xs text-muted-foreground">
                +{stat.newValue.toLocaleString()} in the last 30 days
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 