import { Metadata } from "next"
import { AppsTable } from "@/components/admin/apps-table"

export const metadata: Metadata = {
  title: "Admin | Apps",
  description: "Manage app submissions and approvals",
}

export default async function AdminAppsPage() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Apps Management</h1>
        <p className="text-muted-foreground">
          Review and manage app submissions from developers.
        </p>
      </div>
      <AppsTable />
    </div>
  )
} 