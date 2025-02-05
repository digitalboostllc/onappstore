"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { format } from "date-fns"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { UserActions } from "./user-actions"
import { CreateUserDialog } from "./create-user-dialog"

interface User {
  id: string
  name: string | null
  email: string
  isAdmin: boolean
  isBanned: boolean
  createdAt: Date
  developer: {
    _count: {
      apps: number
    }
  } | null
  _count: {
    downloads: number
    reviews: number
  }
}

interface UsersTableProps {
  initialData: {
    users: User[]
    total: number
    pages: number
  }
  currentUserId: string
}

export function UsersTable({ initialData, currentUserId }: UsersTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = useState({})
  const [{ users, total, pages }, setData] = useState(initialData)
  const [currentPage, setCurrentPage] = useState(1)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const params = new URLSearchParams()
      if (searchParams.get("search")) params.set("search", searchParams.get("search")!)
      if (searchParams.get("role")) params.set("role", searchParams.get("role")!)
      if (searchParams.get("status")) params.set("status", searchParams.get("status")!)
      params.set("page", currentPage.toString())

      const response = await fetch(`/api/admin/users?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setData(data)
      }
    }

    fetchData()
  }, [searchParams, currentPage])

  const handleActionComplete = useCallback((userId: string, action: string, success: boolean) => {
    if (!success) return

    setData((prev: typeof initialData) => ({
      ...prev,
      users: prev.users.map((user: User) => {
        if (user.id === userId) {
          switch (action) {
            case "promote":
              return { ...user, isAdmin: true }
            case "demote":
              return { ...user, isAdmin: false }
            case "ban":
              return { ...user, isBanned: true }
            case "unban":
              return { ...user, isBanned: false }
            case "delete":
              return null
            default:
              return user
          }
        }
        return user
      }).filter(Boolean) as User[],
    }))
  }, [])

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "isAdmin",
      header: "Role",
      cell: ({ row }) => (
        <Badge variant={row.getValue("isAdmin") ? "default" : "secondary"}>
          {row.getValue("isAdmin") ? "Admin" : "User"}
        </Badge>
      ),
    },
    {
      accessorKey: "isBanned",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.getValue("isBanned") ? "destructive" : "secondary"}>
          {row.getValue("isBanned") ? "Banned" : "Active"}
        </Badge>
      ),
    },
    {
      accessorKey: "developer._count.apps",
      header: "Apps",
      cell: ({ row }) => row.original.developer?._count.apps || 0,
    },
    {
      accessorKey: "_count.downloads",
      header: "Downloads",
      cell: ({ row }) => {
        const count = row.original._count?.downloads
        return (
          <div className="text-right tabular-nums">
            {count?.toLocaleString() || 0}
          </div>
        )
      },
    },
    {
      accessorKey: "_count.reviews",
      header: "Reviews",
      cell: ({ row }) => {
        const count = row.original._count?.reviews
        return (
          <div className="text-right tabular-nums">
            {count?.toLocaleString() || 0}
          </div>
        )
      },
    },
    {
      accessorKey: "createdAt",
      header: "Joined",
      cell: ({ row }) => format(new Date(row.getValue("createdAt")), "MMM d, yyyy"),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <UserActions
          userId={row.original.id}
          isAdmin={row.original.isAdmin}
          isBanned={row.original.isBanned}
          onActionComplete={(action, success) => handleActionComplete(row.original.id, action, success)}
          currentUserId={currentUserId}
        />
      ),
    },
  ]

  const table = useReactTable({
    data: users,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Filter users..."
          value={table.getColumn("email")?.getFilterValue() as string}
          onChange={(event) =>
            table.getColumn("email")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <CreateUserDialog />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="text-sm text-muted-foreground">
          Page {currentPage} of {pages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, pages))}
          disabled={currentPage === pages}
        >
          Next
        </Button>
      </div>
    </div>
  )
} 