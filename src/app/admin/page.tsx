import { Metadata } from "next"
import { getDashboardStats } from "@/lib/services/analytics-service"
import { getActivityLogs } from "@/lib/services/activity-logger"
import { StatsCards } from "@/components/admin/stats-cards"
import { AnalyticsCharts } from "@/components/admin/analytics-charts"
import { ActivityLog } from "@/components/admin/activity-log"
import { DashboardHeader } from "@/components/admin/dashboard-header"
import { DashboardShell } from "@/components/admin/dashboard-shell"
import { DashboardStats } from "@/components/admin/dashboard-stats"
import { DashboardCharts } from "@/components/admin/dashboard-charts"
import { checkAdminAccess } from "@/lib/auth/utils"

export const metadata: Metadata = {
  title: "Admin | Dashboard",
  description: "Admin dashboard with analytics and activity monitoring",
}

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function AdminPage() {
  await checkAdminAccess()
  const stats = await getDashboardStats()

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Dashboard"
        text="Get an overview of your app store's performance."
      />
      <div className="grid gap-4">
        <DashboardStats
          totalUsers={stats.total.users}
          totalApps={stats.total.apps}
          totalDownloads={stats.total.downloads}
          totalRatings={stats.total.ratings}
          totalComments={stats.total.comments}
          newUsers={stats.new.users}
          newApps={stats.new.apps}
          newDownloads={stats.new.downloads}
          newRatings={stats.new.ratings}
          newComments={stats.new.comments}
        />
        <DashboardCharts
          categoryDistribution={stats.categoryDistribution}
          dailyStats={stats.dailyStats}
        />
      </div>
    </DashboardShell>
  )
} 