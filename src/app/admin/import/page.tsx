import { Metadata } from "next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ImportForm } from "@/components/admin/import-form"
import { SyncForm } from "@/components/admin/sync-form"
import { syncApps } from "@/lib/services/sync-service"
import { PageHeader } from "@/components/page-header"
import { revalidatePath } from "next/cache"

async function syncAction(formData: FormData) {
  "use server"
  
  try {
    const stats = await syncApps()
    revalidatePath('/admin/import')
  } catch (error) {
    console.error("Sync failed:", error)
    throw error // Re-throw to handle in the client
  }
}

export const metadata: Metadata = {
  title: "Admin | Import",
  description: "Import apps from other sources",
}

export default function ImportPage() {
  return (
    <div className="container py-8">
      <PageHeader>
        <PageHeader.Title>Import Apps</PageHeader.Title>
        <PageHeader.Description>
          Import apps from various sources or sync existing apps.
        </PageHeader.Description>
      </PageHeader>

      <div className="mt-8 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Sync Apps</CardTitle>
            <CardDescription>
              Sync your app database with the source. This will:
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li>Add new apps that aren't in your database</li>
                <li>Update existing apps with new information</li>
                <li>Mark removed apps as unavailable</li>
              </ul>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SyncForm action={syncAction} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import Source</CardTitle>
            <CardDescription>
              Choose a source to import apps from and configure the import settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImportForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 