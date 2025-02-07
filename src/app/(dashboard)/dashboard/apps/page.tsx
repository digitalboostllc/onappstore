import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth/utils"
import { getDeveloperWithBasicApps, createDeveloper } from "@/lib/services/developer-service"
import { formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AppStatsCell } from "@/components/apps/app-stats-cell"
import Link from "next/link"

export default async function DeveloperAppsPage() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      redirect("/login")
    }

    const developer = await getDeveloperWithBasicApps(user.id)

    if (!developer) {
      // Create developer profile if it doesn't exist
      await createDeveloper(user.id)
      // Refresh the page to load the new developer profile
      redirect("/dashboard/apps")
    }

    return (
      <div className="container py-8 space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">My Apps</h1>
          <Button asChild>
            <Link href="/dashboard/submit">Submit New App</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Apps Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Downloads</TableHead>
                  <TableHead>Ratings</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {developer.apps.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.name}</TableCell>
                    <TableCell>
                      <Badge variant={app.published ? "default" : "secondary"}>
                        {app.published ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <AppStatsCell appId={app.id} />
                    <TableCell>{formatDate(app.updatedAt.getTime())}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/apps/${app.id}/edit`}>
                            Edit
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/apps/${app.id}`}>
                            View
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {developer.apps.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No apps found. Submit your first app to get started!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    )
  } catch (error) {
    console.error("[DASHBOARD_APPS]", error)
    redirect("/login")
  }
} 