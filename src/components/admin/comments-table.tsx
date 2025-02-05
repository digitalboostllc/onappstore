"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/hooks/use-toast"
import { formatDate } from "@/lib/utils"
import { 
  MoreHorizontal, 
  Search, 
  Trash, 
  Edit, 
  Eye, 
  Ban, 
  Check,
  MessageSquare,
  MessageSquareReply,
  Loader2,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface Comment {
  id: string
  comment: string
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string | null
    email: string | null
  }
  app: {
    id: string
    name: string
  }
  parentId: string | null
  isHidden?: boolean
}

interface CommentWithReplies extends Comment {
  replies?: CommentWithReplies[]
}

export function CommentsTable() {
  const router = useRouter()
  const [comments, setComments] = useState<Comment[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editedComment, setEditedComment] = useState("")
  const [selectedComments, setSelectedComments] = useState<string[]>([])
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null)
  const [recentlyEditedId, setRecentlyEditedId] = useState<string | null>(null)

  // Clear highlight effect after animation
  useEffect(() => {
    if (recentlyEditedId) {
      const timer = setTimeout(() => {
        setRecentlyEditedId(null)
      }, 1000) // Duration matches the CSS animation
      return () => clearTimeout(timer)
    }
  }, [recentlyEditedId])

  // Fetch comments on component mount
  useEffect(() => {
    fetchComments()
  }, [])

  const fetchComments = async () => {
    try {
      const response = await fetch("/api/admin/comments")
      if (!response.ok) throw new Error("Failed to fetch comments")
      const data = await response.json()
      setComments(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch comments. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (commentId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/comments/${commentId}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete comment")
      
      toast({
        title: "Success",
        description: "Comment deleted successfully",
      })
      
      setComments(prev => prev.filter(c => c.id !== commentId))
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete comment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsDeleteDialogOpen(false)
      setCommentToDelete(null)
    }
  }

  const handleEdit = async (commentId: string) => {
    if (!editedComment.trim()) return

    try {
      const response = await fetch(`/api/admin/comments/${commentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ comment: editedComment }),
      })
      if (!response.ok) throw new Error("Failed to update comment")
      
      toast({
        title: "Success",
        description: "Comment updated successfully",
      })
      
      setComments(prev => prev.map(c => 
        c.id === commentId ? { ...c, comment: editedComment } : c
      ))
      setIsEditing(false)
      setIsEditDialogOpen(false)
      setSelectedComment(null)
      setRecentlyEditedId(commentId)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update comment. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleToggleVisibility = async (commentId: string, isHidden: boolean) => {
    try {
      const response = await fetch(`/api/admin/comments/${commentId}/visibility`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isHidden: !isHidden }),
      })
      if (!response.ok) throw new Error("Failed to update comment visibility")
      
      toast({
        title: "Success",
        description: `Comment ${isHidden ? "shown" : "hidden"} successfully`,
      })
      
      // Find if this is a top-level comment
      const comment = comments.find(c => c.id === commentId)
      if (comment && !comment.parentId) {
        // If it's a top-level comment, update it and all its replies
        setComments(prev => prev.map(c => 
          c.id === commentId || c.parentId === commentId
            ? { ...c, isHidden: !isHidden }
            : c
        ))
      } else {
        // If it's a reply, just update it
        setComments(prev => prev.map(c => 
          c.id === commentId ? { ...c, isHidden: !isHidden } : c
        ))
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update comment visibility. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedComments(filteredComments.map(comment => comment.id))
    } else {
      setSelectedComments([])
    }
  }

  const handleSelectComment = (commentId: string, checked: boolean) => {
    if (checked) {
      setSelectedComments(prev => [...prev, commentId])
    } else {
      setSelectedComments(prev => prev.filter(id => id !== commentId))
    }
  }

  const handleBulkDelete = async () => {
    if (!selectedComments.length) return
    setIsLoading(true)

    try {
      const promises = selectedComments.map(commentId =>
        fetch(`/api/admin/comments/${commentId}`, {
          method: "DELETE",
        })
      )
      await Promise.all(promises)
      
      toast({
        title: "Success",
        description: `${selectedComments.length} comments deleted successfully`,
      })
      
      setComments(prev => prev.filter(c => !selectedComments.includes(c.id)))
      setSelectedComments([])
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete comments. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsBulkDeleteDialogOpen(false)
    }
  }

  const handleBulkVisibility = async (hide: boolean) => {
    if (!selectedComments.length) return

    try {
      const promises = selectedComments.map(commentId =>
        fetch(`/api/admin/comments/${commentId}/visibility`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ isHidden: hide }),
        })
      )
      await Promise.all(promises)
      
      toast({
        title: "Success",
        description: `${selectedComments.length} comments ${hide ? "hidden" : "shown"} successfully`,
      })
      
      setComments(prev => prev.map(c => 
        selectedComments.includes(c.id) ? { ...c, isHidden: hide } : c
      ))
      setSelectedComments([])
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${hide ? "hide" : "show"} comments. Please try again.`,
        variant: "destructive",
      })
    }
  }

  // Group comments by parent ID and sort them
  const organizeComments = (comments: Comment[]): CommentWithReplies[] => {
    const topLevelComments = comments.filter(c => !c.parentId)
    const repliesByParentId = comments.reduce((acc, comment) => {
      if (comment.parentId) {
        if (!acc[comment.parentId]) {
          acc[comment.parentId] = []
        }
        acc[comment.parentId].push(comment)
      }
      return acc
    }, {} as Record<string, Comment[]>)

    const addReplies = (comment: Comment): CommentWithReplies => ({
      ...comment,
      replies: (repliesByParentId[comment.id] || [])
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map(addReplies)
    })

    return topLevelComments
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(addReplies)
  }

  const filteredComments = comments.filter(comment => 
    comment.comment.toLowerCase().includes(searchQuery.toLowerCase()) ||
    comment.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    comment.user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    comment.app.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const organizedComments = organizeComments(filteredComments)

  const renderCommentRow = (comment: CommentWithReplies, depth = 0): React.ReactElement => (
    <React.Fragment key={comment.id}>
      <TableRow 
        className={cn(
          recentlyEditedId === comment.id && "animate-highlight bg-primary/5",
          depth > 0 && "bg-muted/30"
        )}
      >
        <TableCell>
          <Checkbox 
            checked={selectedComments.includes(comment.id)}
            onCheckedChange={(checked) => handleSelectComment(comment.id, !!checked)}
          />
        </TableCell>
        <TableCell className="max-w-[300px] relative">
          <div className="flex items-start gap-2">
            {depth > 0 && (
              <>
                {Array.from({ length: depth }).map((_, index) => (
                  <div 
                    key={index}
                    className="absolute border-l-2 border-muted-foreground/20"
                    style={{
                      left: `${(index + 1) * 2}rem`,
                      top: 0,
                      bottom: 0,
                      width: '2px'
                    }}
                  />
                ))}
                <div 
                  className="absolute border-t-2 border-muted-foreground/20"
                  style={{
                    left: `${depth * 2}rem`,
                    width: '2rem',
                    top: '50%'
                  }}
                />
              </>
            )}
            <div 
              className="flex items-center gap-2 min-w-0" 
              style={{ marginLeft: depth > 0 ? `${(depth * 2) + 2}rem` : 0 }}
            >
              {comment.parentId ? (
                <MessageSquareReply className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <div className="truncate max-w-[200px] text-sm">
                <span className="block truncate" title={comment.comment}>
                  {comment.comment}
                </span>
              </div>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            {comment.user.name || comment.user.email || "Anonymous"}
          </div>
        </TableCell>
        <TableCell>
          <Button
            variant="link"
            className="p-0 h-auto"
            onClick={() => router.push(`/apps/${comment.app.id}`)}
          >
            {comment.app.name}
          </Button>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            {comment.parentId ? (
              <MessageSquareReply className="h-4 w-4" />
            ) : (
              <MessageSquare className="h-4 w-4" />
            )}
            {comment.parentId ? "Reply" : "Comment"}
            {!comment.parentId && comment.replies?.length ? (
              <span className="text-xs text-muted-foreground">
                ({comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"})
              </span>
            ) : null}
          </div>
        </TableCell>
        <TableCell>
          {formatDate(comment.createdAt)}
        </TableCell>
        <TableCell>
          <span className={cn(
            "px-2 py-1 rounded-full text-xs",
            comment.isHidden 
              ? "bg-red-100 text-red-800" 
              : "bg-green-100 text-green-800"
          )}>
            {comment.isHidden ? "Hidden" : "Visible"}
          </span>
        </TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => {
                    e.preventDefault()
                    setSelectedComment(comment)
                    setEditedComment(comment.comment)
                    setIsEditing(true)
                    setIsEditDialogOpen(true)
                  }}>
                    <Edit className="w-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit {comment.parentId ? "Reply" : "Comment"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Textarea
                      value={editedComment}
                      onChange={(e) => setEditedComment(e.target.value)}
                      rows={5}
                      placeholder="Edit your comment..."
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false)
                        setIsEditDialogOpen(false)
                        setSelectedComment(null)
                      }}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => selectedComment && handleEdit(selectedComment.id)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <DropdownMenuItem onSelect={() => router.push(`/apps/${comment.app.id}`)}>
                <Eye className="w-4 h-4 mr-2" />
                View App
              </DropdownMenuItem>
              <DropdownMenuItem 
                onSelect={() => handleToggleVisibility(comment.id, !!comment.isHidden)}
              >
                <Ban className="w-4 h-4 mr-2" />
                {comment.isHidden ? "Show" : "Hide"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onSelect={() => {
                  setCommentToDelete(comment.id)
                  setIsDeleteDialogOpen(true)
                }}
                className="text-red-600"
              >
                <Trash className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
      {comment.replies?.map(reply => renderCommentRow(reply, depth + 1))}
    </React.Fragment>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search comments..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {selectedComments.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedComments.length} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkVisibility(true)}
              disabled={isLoading}
            >
              <Ban className="h-4 w-4 mr-2" />
              Hide Selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkVisibility(false)}
              disabled={isLoading}
            >
              <Eye className="h-4 w-4 mr-2" />
              Show Selected
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsBulkDeleteDialogOpen(true)}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash className="h-4 w-4 mr-2" />
              )}
              Delete Selected
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox 
                  checked={selectedComments.length === filteredComments.length && filteredComments.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Comment</TableHead>
              <TableHead>User</TableHead>
              <TableHead>App</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {organizedComments.map(comment => renderCommentRow(comment))}
          </TableBody>
        </Table>
      </div>

      {/* Delete Single Comment Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the comment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => commentToDelete && handleDelete(commentToDelete)}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {selectedComments.length} comments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete All'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 