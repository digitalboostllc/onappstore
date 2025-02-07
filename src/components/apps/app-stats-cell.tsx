"use client"

import { useQuery } from "@tanstack/react-query"
import { TableCell } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

interface AppStats {
  latestVersion: {
    version: string
    _count: {
      downloads: number
    }
  } | null
  ratings: number
}

async function fetchAppStats(appId: string): Promise<AppStats> {
  const response = await fetch(`/api/developer/apps/stats?appId=${appId}`)
  if (!response.ok) throw new Error('Failed to load stats')
  return response.json()
}

export function AppStatsCell({ appId }: { appId: string }) {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['app-stats', appId],
    queryFn: () => fetchAppStats(appId),
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    retry: 1, // Only retry once on failure
  })

  if (isLoading) {
    return (
      <>
        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
      </>
    )
  }

  if (error) {
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
      <TableCell>
        {stats?.latestVersion ? `v${stats.latestVersion.version}` : "No version"}
      </TableCell>
      <TableCell>
        {stats?.latestVersion?._count.downloads ?? 0}
      </TableCell>
      <TableCell>
        {stats?.ratings ?? 0}
      </TableCell>
    </>
  )
} 