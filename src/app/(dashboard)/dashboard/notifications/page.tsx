import { getCurrentUser } from "@/lib/session"
import { redirect } from "next/navigation"
import { notificationService } from "@/lib/services/notification-service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/utils"
import { Bell, Check } from "lucide-react"
import type { Notification } from "@prisma/client"

export default async function NotificationsPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }

  const { notifications, total } = await notificationService.getUserNotifications(user.id)

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with app releases and activity
          </p>
        </div>
        {notifications.some((n: Notification) => !n.read) && (
          <form action="/api/notifications" method="PATCH">
            <Button type="submit" variant="outline">
              <Check className="w-4 h-4 mr-2" />
              Mark all as read
            </Button>
          </form>
        )}
      </div>

      <div className="space-y-4">
        {notifications.map((notification: Notification) => (
          <Card key={notification.id} className={notification.read ? "opacity-60" : ""}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                <CardTitle className="text-lg">{notification.title}</CardTitle>
              </div>
              <CardDescription>
                {formatDate(notification.createdAt.getTime())}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>{notification.message}</p>
            </CardContent>
          </Card>
        ))}

        {notifications.length === 0 && (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No notifications</h3>
            <p className="text-muted-foreground">
              You're all caught up! Check back later for updates.
            </p>
          </div>
        )}
      </div>
    </div>
  )
} 