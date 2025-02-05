import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth/session"
import { getActivityLogs } from "@/lib/services/activity-logger"
import { ActivityLog } from "@/components/admin/activity-log"
import { PageHeader } from "@/components/page-header"
import type { LogActivityParams } from "@/lib/services/activity-logger"

export default async function ActivityPage() {
  const user = await getCurrentUser()

  if (!user || !user.isAdmin) {
    redirect("/login")
  }

  const data = await getActivityLogs()
  const initialLogs = {
    ...data,
    logs: data.logs.map(log => ({
      ...log,
      action: log.action as LogActivityParams["action"],
      entityType: log.entityType as LogActivityParams["entityType"],
      createdAt: log.createdAt.toISOString(),
      details: log.details as Record<string, unknown> | null
    }))
  }

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeader.Title>Activity Logs</PageHeader.Title>
        <PageHeader.Description>
          View and filter user activity across the platform.
        </PageHeader.Description>
      </PageHeader>

      <ActivityLog initialLogs={initialLogs} />
    </div>
  )
} 