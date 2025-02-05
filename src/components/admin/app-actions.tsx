"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ExternalLink, Eye, Loader2, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "@/hooks/use-toast"
import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export interface AppActionsProps {
  appId: string
  userId: string
  published: boolean
  onUpdate: (appId: string, action: string) => void
}

export function AppActions({ appId, userId, published, onUpdate }: AppActionsProps) {
  const router = useRouter()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  async function onAction(action: "approve" | "reject" | "unpublish" | "delete") {
    try {
      setIsLoading(true)
      setActionInProgress(action)
      
      // Optimistic update for UI
      if (action === "approve") {
        onUpdate(appId, "approve")
      } else if (action === "unpublish" || action === "reject") {
        onUpdate(appId, "unpublish")
      }

      const response = await fetch(`/api/admin/apps/${appId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      })

      if (!response.ok) {
        throw new Error("Failed to perform action")
      }

      // Only show toast for non-publish/unpublish actions
      if (action === "delete") {
        toast({
          title: "Success",
          description: `App deleted successfully`,
        })
      }
    } catch (error) {
      console.error("Error:", error)
      // Revert optimistic update
      onUpdate(appId, "revert")
      toast({
        title: "Error",
        description: "Failed to perform action. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setActionInProgress(null)
      setShowDeleteDialog(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.push(`/apps/${appId}`)}
        className="h-8 w-8"
      >
        <ExternalLink className="h-4 w-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreVertical className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!published ? (
            <DropdownMenuItem
              onClick={() => onAction("approve")}
              disabled={isLoading}
            >
              {actionInProgress === "approve" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Approve
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => onAction("unpublish")}
              disabled={isLoading}
            >
              {actionInProgress === "unpublish" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Unpublish
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            disabled={isLoading}
            className="text-destructive focus:text-destructive"
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the app
              and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onAction("delete")}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={isLoading}
            >
              {actionInProgress === "delete" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 