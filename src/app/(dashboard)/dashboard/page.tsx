import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth/utils"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"

export default async function DashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  // Check if user is a developer
  const developer = await prisma.developer.findUnique({
    where: { userId: user.id },
    include: {
      _count: {
        select: {
          apps: true
        }
      }
    }
  })

  // Get user's collections count
  const collectionsCount = await prisma.collection.count({
    where: { userId: user.id }
  })

  // Get unread notifications count
  const unreadNotificationsCount = await prisma.notification.count({
    where: { 
      userId: user.id,
      read: false
    }
  })

  return (
    <div className="container py-8 space-y-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold">Welcome back, {user?.name}</h1>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {developer && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Your Apps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{developer._count.apps}</div>
                <Button variant="link" asChild className="px-0">
                  <Link href="/dashboard/apps">
                    Manage Apps <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Collections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{collectionsCount}</div>
              <Button variant="link" asChild className="px-0">
                <Link href="/dashboard/collections">
                  View Collections <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unreadNotificationsCount}</div>
              <Button variant="link" asChild className="px-0">
                <Link href="/dashboard/notifications">
                  View Notifications <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {developer && (
            <Card>
              <CardHeader>
                <CardTitle>Submit an App</CardTitle>
                <CardDescription>
                  Share your application with the Mac community
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link href="/dashboard/submit">
                    Submit New App <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your profile and security settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/dashboard/settings">
                  Update Settings <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 