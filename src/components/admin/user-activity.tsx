"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface Activity {
  id: string
  action: string
  entityType: string
  entityId: string
  details: any
  createdAt: string
}

async function fetchUserActivity(userId: string): Promise<Activity[]> {
  const response = await fetch(`/api/admin/users/activity?userId=${userId}&limit=5`)
  if (!response.ok) throw new Error('Failed to load activity')
  return response.json()
}

export function UserActivity({ userId }: { userId: string }) {
  const { data: activities, isLoading, error } = useQuery({
    queryKey: ['user-activity', userId],
    queryFn: () => fetchUserActivity(userId),
    staleTime: 1000 * 60, // Consider data fresh for 1 minute
    refetchInterval: 1000 * 60, // Refetch every minute
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Failed to load activity</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities?.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity</p>
        ) : (
          activities?.map((activity) => (
            <div key={activity.id} className="flex flex-col gap-1">
              <p className="text-sm font-medium">
                {activity.action} {activity.entityType}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(activity.createdAt).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
} 