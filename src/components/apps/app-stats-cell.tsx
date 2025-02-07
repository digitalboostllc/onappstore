"use client"

import { useEffect, useState } from "react"
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

export function AppStatsCell({ appId }: { appId: string }) {
  const [stats, setStats] = useState<AppStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadStats() {
      try {
        const response = await fetch(`/api/developer/apps/stats?appId=${appId}`)
        if (!response.ok) throw new Error('Failed to load stats')
        const data = await response.json()
        setStats(data)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load stats')
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [appId])

  if (loading) {
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