"use client"

import { useQuery } from "@tanstack/react-query"
import { TableCell } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

interface UserStats {
  appsCount: number
  activitiesCount: number
  collectionsCount: number
}

async function fetchUserStats(userId: string): Promise<UserStats> {
  const response = await fetch(`/api/admin/users/stats?userId=${userId}`)
  if (!response.ok) throw new Error('Failed to load stats')
  return response.json()
}

export function UserStatsCell({ userId }: { userId: string }) {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['user-stats', userId],
    queryFn: () => fetchUserStats(userId),
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    retry: 1,
  })

  if (isLoading) {
    return (
      <>
        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
      </>
    )
  }

  if (error || !stats) {
    return (
      <>
        <TableCell>Error</TableCell>
        <TableCell>Error</TableCell>
        <TableCell>Error</TableCell>
      </>
    )
  }

  return (
    <>
      <TableCell>{stats?.appsCount ?? 0}</TableCell>
      <TableCell>{stats?.activitiesCount ?? 0}</TableCell>
      <TableCell>{stats?.collectionsCount ?? 0}</TableCell>
    </>
  )
} 