"use client"

import { useEffect, useState, memo } from "react"
import { useRouter } from "next/navigation"
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { AppActions } from "./app-actions"
import { MoreVertical, MoreHorizontal, Check, X as XIcon, Ban, Loader2, Trash2 } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import Image from "next/image"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface App {
  id: string
  name: string
  icon: string | null
  developer: {
    id: string
    user: {
      name: string | null
    }
  }
  category: {
    id: string
    name: string
  } | null
  subcategory: {
    id: string
    name: string
  } | null
  price: string | null
  published: boolean
  _count: {
    downloads: number
    reviews: number
  }
  createdAt: Date
  downloadCount: number
}

const AppTableRow = memo(function AppTableRow({ 
  row, 
  onUpdate 
}: { 
  row: any,
  onUpdate: (appId: string, action: string) => void 
}) {
  return (
    <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
      {row.getVisibleCells().map((cell: any) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
}, (prevProps, nextProps) => {
  // Only re-render if the published status or selection state changes
  return (
    prevProps.row.original.published === nextProps.row.original.published &&
    prevProps.row.getIsSelected() === nextProps.row.getIsSelected()
  )
})

export function AppsTable() {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const [data, setData] = useState<App[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [currentAction, setCurrentAction] = useState<string | null>(null)
  const [showActionDialog, setShowActionDialog] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [pageSize, setPageSize] = useState(50)

  // Reset row selection when data changes
  useEffect(() => {
    setRowSelection({})
  }, [data])

  useEffect(() => {
    async function fetchApps() {
      try {
        setLoading(true)
        setError(null)
        const apps = await getApps()
        console.log(`Fetched ${apps.length} apps`)
        setData(apps)
      } catch (err) {
        console.error("Failed to fetch apps:", err)
        setError("Failed to load apps")
      } finally {
        setLoading(false)
      }
    }

    fetchApps()
  }, [])

  const handleUpdate = (appId: string, action: string) => {
    setData((currentData) => {
      if (action === "revert") {
        // Only refresh the specific app instead of all data
        fetch(`/api/admin/apps/${appId}`)
          .then(res => res.json())
          .then(updatedApp => {
            setData(prevData => 
              prevData.map(app => app.id === appId ? { ...app, ...updatedApp } : app)
            )
          })
          .catch(console.error)
        return currentData
      }

      return currentData.map((app) => {
        if (app.id === appId) {
          switch (action) {
            case "approve":
              return { ...app, published: true }
            case "reject":
            case "unpublish":
              return { ...app, published: false }
            case "delete":
              return null
            default:
              return app
          }
        }
        return app
      }).filter(Boolean) as App[]
    })
  }

  const handleBulkDelete = async () => {
    try {
      setIsDeleting(true)
      const selectedRows = table.getSelectedRowModel().rows
      const appIds = selectedRows.map(row => row.original.id)

      const response = await fetch("/api/admin/apps/bulk-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ appIds }),
      })

      if (!response.ok) {
        throw new Error("Failed to delete apps")
      }

      // Refresh the table data
      const apps = await getApps()
      setData(apps)
      // Reset row selection
      setRowSelection({})
      setShowDeleteDialog(false)
    } catch (error) {
      console.error("Error deleting apps:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBulkAction = async (action: string) => {
    try {
      setIsProcessing(true)
      const selectedRows = table.getSelectedRowModel().rows
      const appIds = selectedRows.map(row => row.original.id)

      const response = await fetch("/api/admin/apps/bulk-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ appIds, action }),
      })

      if (!response.ok) {
        throw new Error("Failed to perform bulk action")
      }

      // Refresh the table data
      const apps = await getApps()
      setData(apps)
      // Reset row selection
      setRowSelection({})
      setShowActionDialog(false)
    } catch (error) {
      console.error("Error performing bulk action:", error)
    } finally {
      setIsProcessing(false)
      setCurrentAction(null)
    }
  }

  const columns: ColumnDef<App>[] = [
    {
      id: "select",
      header: ({ table }) => {
        const isAllSelected = 
          table.getFilteredRowModel().rows.length > 0 &&
          table.getIsAllPageRowsSelected()
        const isSomeSelected = 
          table.getIsSomeRowsSelected() && 
          !table.getIsAllPageRowsSelected()

        return (
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={(value) => {
              table.toggleAllPageRowsSelected(!!value)
            }}
            aria-label="Select all"
            className="translate-y-[2px]"
            data-state={isSomeSelected ? "indeterminate" : isAllSelected ? "checked" : "unchecked"}
          />
        )
      },
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="relative w-8 h-8">
            <Image
              src={row.original.icon || "/app-placeholder.svg"}
              alt={row.getValue("name")}
              fill
              className="object-contain rounded-md"
              unoptimized
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = "/app-placeholder.svg"
              }}
            />
          </div>
          <span>{row.getValue("name")}</span>
        </div>
      ),
    },
    {
      accessorKey: "developer.user.name",
      header: "Developer",
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => {
        const category = row.original.category
        const subcategory = row.original.subcategory
        
        if (!category) return <span className="text-muted-foreground">Uncategorized</span>
        
        return subcategory
          ? <span>{category.name} <span className="text-muted-foreground">›</span> {subcategory.name}</span>
          : category.name
      },
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => {
        const price = row.getValue("price") as string | null
        return (
          <Badge variant={price ? "secondary" : "outline"}>
            {price || "Free"}
          </Badge>
        )
      },
    },
    {
      accessorKey: "published",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.getValue("published") ? "default" : "secondary"}>
          {row.getValue("published") ? "Published" : "Draft"}
        </Badge>
      ),
    },
    {
      accessorKey: "downloadCount",
      header: "Downloads",
      cell: ({ row }) => {
        const downloads = row.getValue("downloadCount") as number | null
        return (
          <div className="text-right tabular-nums">
            {downloads?.toLocaleString() || 0}
          </div>
        )
      },
    },
    {
      accessorKey: "_count",
      header: "Reviews",
      cell: ({ row }) => {
        const countData = row.getValue("_count") as { reviews: number }
        return (
          <div className="text-right tabular-nums">
            {countData?.reviews?.toLocaleString() || 0}
          </div>
        )
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => format(new Date(row.getValue("createdAt")), "MMM d, yyyy"),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <AppActions
          appId={row.original.id}
          userId={row.original.developer.id}
          published={row.original.published}
          onUpdate={handleUpdate}
        />
      ),
    },
  ]

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
    enableRowSelection: true,
    enableMultiRowSelection: true,
  })

  return (
    <div className="w-full">
      <div className="flex items-center justify-between py-4">
        <Input
          placeholder="Filter apps..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          {table.getSelectedRowModel().rows.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Actions ({table.getSelectedRowModel().rows.length})
                  <MoreHorizontal className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(() => {
                  const selectedRows = table.getSelectedRowModel().rows
                  const hasUnpublished = selectedRows.some(row => !row.original.published)
                  const hasPublished = selectedRows.some(row => row.original.published)
                  
                  return (
                    <>
                      {hasUnpublished && (
                        <DropdownMenuItem
                          onClick={() => {
                            setCurrentAction("approve")
                            setShowActionDialog(true)
                          }}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Approve
                        </DropdownMenuItem>
                      )}
                      {hasPublished && (
                        <DropdownMenuItem
                          onClick={() => {
                            setCurrentAction("unpublish")
                            setShowActionDialog(true)
                          }}
                        >
                          <Ban className="mr-2 h-4 w-4" />
                          Unpublish
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setCurrentAction("delete")
                          setShowActionDialog(true)
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )
                })()}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Loading apps...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-red-500"
                >
                  {error}
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <AppTableRow 
                  key={row.id} 
                  row={row}
                  onUpdate={handleUpdate}
                />
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
        <div className="flex items-center space-x-2">
          <p className="text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} total rows
          </p>
          <div className="flex items-center space-x-2">
            <p className="text-sm text-muted-foreground">|</p>
            <p className="text-sm text-muted-foreground">
              {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )} of {table.getFilteredRowModel().rows.length}
            </p>
            <p className="text-sm text-muted-foreground">|</p>
          </div>
          <p className="text-sm text-muted-foreground">Rows per page</p>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => {
              const size = parseInt(value)
              setPageSize(size)
              table.setPageSize(size)
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue>{pageSize}</SelectValue>
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 50, 100].map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {table.getSelectedRowModel().rows.length} selected apps
              and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const selectedRows = table.getSelectedRowModel().rows
                const count = selectedRows.length
                const publishedCount = selectedRows.filter(row => row.original.published).length
                const unpublishedCount = count - publishedCount

                switch (currentAction) {
                  case "approve":
                    return `This will publish ${count} selected draft ${count === 1 ? 'app' : 'apps'}.`
                  case "unpublish":
                    return `This will unpublish ${count} selected ${count === 1 ? 'app' : 'apps'} from the store.`
                  case "delete":
                    return `This will permanently delete ${count} selected ${count === 1 ? 'app' : 'apps'} and all associated data. This action cannot be undone.`
                  default:
                    return "Are you sure you want to perform this action?"
                }
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => currentAction && handleBulkAction(currentAction)}
              className={cn(
                "text-primary-foreground",
                currentAction === "delete" && "bg-destructive hover:bg-destructive/90",
                currentAction === "approve" && "bg-primary hover:bg-primary/90"
              )}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {currentAction === "delete" && "Delete"}
                  {currentAction === "approve" && "Approve"}
                  {currentAction === "unpublish" && "Unpublish"}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

async function getApps() {
  const response = await fetch("/api/admin/apps")
  if (!response.ok) {
    throw new Error("Failed to fetch apps")
  }
  return response.json()
} 