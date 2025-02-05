"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { LogActivityParams } from "@/lib/services/activity-logger"

interface ActivityLog {
  id: string
  userId: string
  action: LogActivityParams["action"]
  entityType: LogActivityParams["entityType"]
  entityId: string
  details: Record<string, unknown> | null
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

interface ActivityLogProps {
  initialLogs: {
    logs: ActivityLog[]
    total: number
    pages: number
  }
}

export function ActivityLog({ initialLogs }: ActivityLogProps) {
  const [{ logs, total, pages }, setData] = useState(initialLogs)
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState({
    entityType: "all",
    action: "all",
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (filters.entityType !== "all") params.set("entityType", filters.entityType)
        if (filters.action !== "all") params.set("action", filters.action)
        params.set("page", currentPage.toString())

        const response = await fetch(`/api/admin/activity?${params.toString()}`)
        if (response.ok) {
          const data = await response.json()
          setData(data)
        }
      } catch (error) {
        console.error("Failed to fetch logs:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchLogs()
  }, [currentPage, filters])

  const formatDetails = (details: Record<string, unknown> | null) => {
    if (!details) return "No details"
    try {
      return Object.entries(details)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ")
    } catch (error) {
      return "Invalid details"
    }
  }

  const entityTypes: LogActivityParams["entityType"][] = [
    "USER",
    "APP",
    "REVIEW",
    "DOWNLOAD",
  ]

  const actionTypes: LogActivityParams["action"][] = [
    "CREATE",
    "UPDATE",
    "DELETE",
    "PUBLISH",
    "UNPUBLISH",
    "DOWNLOAD",
    "REVIEW",
    "LOGIN",
    "REGISTER",
    "ROLE_CHANGE",
  ]

  return (
    <Card>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-4">
          <Select
            value={filters.entityType}
            onValueChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                entityType: value,
              }))
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {entityTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.action}
            onValueChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                action: value,
              }))
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {actionTypes.map((action) => (
                <SelectItem key={action} value={action}>
                  {action}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {format(new Date(log.createdAt), "MMM d, yyyy HH:mm")}
                  </TableCell>
                  <TableCell>{log.user.name || log.user.email}</TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>{log.entityType}</TableCell>
                  <TableCell>{formatDetails(log.details)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {logs.length} of {total} entries
          </p>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 text-sm font-medium rounded-md border hover:bg-muted disabled:opacity-50"
              onClick={() => setCurrentPage((p) => p - 1)}
              disabled={currentPage === 1 || loading}
            >
              Previous
            </button>
            <button
              className="px-3 py-2 text-sm font-medium rounded-md border hover:bg-muted disabled:opacity-50"
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={currentPage === pages || loading}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </Card>
  )
} 