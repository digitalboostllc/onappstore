import { getCurrentUser } from "@/lib/auth/utils"
import { redirect } from "next/navigation"
import { notificationService } from "@/lib/services/notification-service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/utils"
import { Bell, Check } from "lucide-react"
import type { Notification } from "@prisma/client"

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  try {
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

        <Card>
          <CardHeader>
            <CardTitle>Recent Notifications</CardTitle>
            <CardDescription>
              You have {total} notification{total !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {notifications.length > 0 ? (
              <div className="space-y-4">
                {notifications.map((notification: Notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border ${
                      !notification.read ? "bg-muted" : ""
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <Bell className="h-5 w-5 mt-1" />
                      <div className="flex-1">
                        <h3 className="font-medium">{notification.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(notification.createdAt.getTime())}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No notifications yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  } catch (error) {
    console.error("[NOTIFICATIONS]", error)
    redirect("/login")
  }
} 