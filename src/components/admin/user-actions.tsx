"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreVertical } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface UserActionsProps {
  userId: string
  isAdmin: boolean
  isBanned: boolean
  onActionComplete: (action: string, success: boolean) => void
  currentUserId: string
}

export function UserActions({ userId, isAdmin, isBanned, onActionComplete, currentUserId }: UserActionsProps) {
  const router = useRouter()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const isSelf = userId === currentUserId

  async function onAction(action: "promote" | "demote" | "ban" | "unban" | "delete") {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || "Failed to perform action")
      }

      onActionComplete(action, true)
      router.refresh()
      
      const actionMessages = {
        promote: "User promoted to admin",
        demote: "Admin demoted to user",
        ban: "User banned",
        unban: "User unbanned",
        delete: "User deleted",
      }

      toast({
        title: "Success",
        description: actionMessages[action],
      })
    } catch (error) {
      onActionComplete(action, false)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to perform action. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setShowDeleteDialog(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0" disabled={isSelf}>
            <span className="sr-only">Open menu</span>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isAdmin ? (
            <DropdownMenuItem
              onClick={() => onAction("demote")}
              disabled={isLoading || isSelf}
            >
              Remove Admin Access
              {isSelf && <span className="text-xs ml-2 text-muted-foreground">(Cannot modify own account)</span>}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => onAction("promote")}
              disabled={isLoading || isSelf}
            >
              Grant Admin Access
              {isSelf && <span className="text-xs ml-2 text-muted-foreground">(Cannot modify own account)</span>}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => onAction(isBanned ? "unban" : "ban")}
            disabled={isLoading || isSelf}
          >
            {isBanned ? "Unban User" : "Ban User"}
            {isSelf && <span className="text-xs ml-2 text-muted-foreground">(Cannot modify own account)</span>}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            disabled={isLoading || isSelf}
            className="text-red-600"
          >
            Delete User
            {isSelf && <span className="text-xs ml-2 text-muted-foreground">(Cannot modify own account)</span>}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user
              account and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onAction("delete")}
              className="bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 