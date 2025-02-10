import { checkAdminAccess } from "@/lib/auth/utils"
import { LogViewer } from "@/components/admin/log-viewer"

export const dynamic = 'force-dynamic'

export default async function LogsPage() {
  // Ensure admin access
  await checkAdminAccess()

  return (
    <div className="container py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Database Logs</h1>
          <p className="text-muted-foreground">
            View and analyze database operations and errors
          </p>
        </div>
      </div>

      <LogViewer />
    </div>
  )
} 