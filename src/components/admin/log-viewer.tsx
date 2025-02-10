"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw } from "lucide-react"

interface Log {
  timestamp: string
  type: 'info' | 'error' | 'warn'
  event: string
  queryId?: string
  operation?: string
  model?: string
  duration?: string
  error?: any
  [key: string]: any
}

export function LogViewer() {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/admin/logs?lines=100')
      if (!response.ok) throw new Error('Failed to fetch logs')
      const data = await response.json()
      setLogs(data.logs)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    // Refresh logs every 30 seconds
    const interval = setInterval(fetchLogs, 30000)
    return () => clearInterval(interval)
  }, [])

  const getEventColor = (type: string) => {
    switch (type) {
      case 'error': return 'text-red-500'
      case 'warn': return 'text-yellow-500'
      default: return 'text-green-500'
    }
  }

  if (loading && !logs.length) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center p-8 text-red-500">
        {error}
        <Button onClick={fetchLogs} variant="outline" className="ml-4">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={fetchLogs} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card className="overflow-auto max-h-[600px]">
        <div className="p-4 space-y-2">
          {logs.map((log, index) => (
            <div
              key={index}
              className="text-sm font-mono p-2 rounded bg-muted/50 space-y-1"
            >
              {/* Timestamp and Type */}
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
                <span className={getEventColor(log.type)}>
                  {log.type.toUpperCase()}
                </span>
                <span className="font-semibold">{log.event}</span>
              </div>

              {/* Query Details */}
              {log.queryId && (
                <div className="pl-4 text-muted-foreground">
                  <div>Query ID: {log.queryId}</div>
                  {log.operation && <div>Operation: {log.operation}</div>}
                  {log.model && <div>Model: {log.model}</div>}
                  {log.duration && <div>Duration: {log.duration}</div>}
                </div>
              )}

              {/* Error Details */}
              {log.error && (
                <div className="pl-4 text-red-500">
                  <pre className="whitespace-pre-wrap">
                    {typeof log.error === 'object' 
                      ? JSON.stringify(log.error, null, 2)
                      : log.error}
                  </pre>
                </div>
              )}
            </div>
          ))}

          {!logs.length && (
            <div className="text-center text-muted-foreground py-8">
              No logs available
            </div>
          )}
        </div>
      </Card>
    </div>
  )
} 