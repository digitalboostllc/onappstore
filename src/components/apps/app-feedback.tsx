"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MessageSquarePlus, Reply, MessageSquareReply, Clock, History } from "lucide-react"
import { formatDate, formatDistanceToNow } from "@/lib/utils"
import { useCurrentUser } from "@/hooks/use-current-user"
import { AppStarRating } from "./app-star-rating"
import { AppCommentForm } from "./app-comment-form"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { formatDistanceToNow as dateFnsFormatDistanceToNow } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Star } from "lucide-react"

interface AppRating {
  id: string
  rating: number
  userId: string
  createdAt: Date
  user: {
    id: string
    name: string | null
    image: string | null
  }
}

interface AppComment {
  id: string
  comment: string
  createdAt: Date
  user: {
    id: string
    name: string | null
    image: string | null
  }
  parentId: string | null
  replies?: AppComment[]
  isHidden?: boolean
}

interface AppWithDetails {
  id: string
  ratings: AppRating[]
  comments: AppComment[]
  _count: {
    ratings: number
  }
}

interface RatingsSectionProps {
  appId: string
  ratings: AppRating[]
  userRating: number
  totalCount: number
}

interface CommentsSectionProps {
  appId: string
  comments: AppComment[]
  onCommentAdded: (newComment: AppComment) => void
  onReplyAdded: (parentId: string, newReply: AppComment) => void
}

interface ReviewCardProps {
  comment: AppComment & { replies?: AppComment[] }
  appId: string
  onReplyAdded: (parentId: string, reply: AppComment) => void
}

// Components
function RatingsSection({ appId, ratings, userRating, totalCount }: RatingsSectionProps) {
  const averageRating = ratings.length 
    ? ratings.reduce((acc: number, rating: AppRating) => acc + rating.rating, 0) / ratings.length 
    : 0

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Ratings</h2>
      <AppStarRating
        appId={appId}
        currentRating={userRating}
        averageRating={averageRating}
        totalRatings={totalCount}
      />
    </div>
  )
}

function ReviewCard({ comment, appId, onReplyAdded }: ReviewCardProps) {
  const [isReplying, setIsReplying] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const user = useCurrentUser()
  const { toast } = useToast()

  const handleReplySubmit = async (values: { comment: string }) => {
    if (isSubmitting) return

    try {
      setIsSubmitting(true)

      const response = await fetch(`/api/apps/${appId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment: values.comment,
          parentId: comment.id
        })
      })

      if (!response.ok) throw new Error('Failed to submit reply')
      
      const newReply = await response.json()
      onReplyAdded(comment.id, newReply)
      
      setIsReplying(false)
      
      toast({
        title: "Reply posted successfully",
        description: "Your reply has been added to the discussion."
      })
    } catch (error) {
      console.error('Error submitting reply:', error)
      toast({
        title: "Failed to post reply",
        description: "Please try again later.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <Avatar className="h-10 w-10">
          <AvatarImage src={comment.user?.image || undefined} />
          <AvatarFallback>{comment.user?.name?.[0] || 'A'}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <p className="font-semibold">{comment.user?.name || 'Anonymous'}</p>
            <p className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </p>
            {user?.isAdmin && comment.isHidden && (
              <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-100">
                Hidden
              </Badge>
            )}
          </div>
          <p className="text-sm">{comment.comment}</p>
          {user && !comment.parentId && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                if (!isSubmitting) {
                  setIsReplying(!isReplying)
                }
              }}
              disabled={isSubmitting}
            >
              <MessageSquareReply className="h-4 w-4 mr-2" />
              {isReplying ? "Cancel Reply" : "Reply"}
            </Button>
          )}
        </div>
      </div>

      {isReplying && (
        <div className="ml-14">
          <AppCommentForm
            appId={appId}
            onSubmit={handleReplySubmit}
            placeholder="Write a reply..."
            submitLabel={isSubmitting ? "Posting..." : "Post Reply"}
            minLength={1}
            disabled={isSubmitting}
          />
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-14 space-y-4 border-l-2 border-muted pl-4">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="flex items-start gap-4">
              <Avatar className="h-8 w-8">
                <AvatarImage src={reply.user?.image || undefined} />
                <AvatarFallback>{reply.user?.name?.[0] || 'A'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{reply.user?.name || 'Anonymous'}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                  </p>
                  {user?.isAdmin && reply.isHidden && (
                    <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-100">
                      Hidden
                    </Badge>
                  )}
                </div>
                <p className="text-sm">{reply.comment}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CommentsSection({ appId, comments, onCommentAdded, onReplyAdded }: CommentsSectionProps) {
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest")

  const sortedTopLevelComments = useMemo(() => {
    const topLevelComments = comments.filter(comment => !comment.parentId)
    return [...topLevelComments].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB
    })
  }, [comments, sortOrder])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Comments</h2>
        <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortOrder("newest")}
            className={cn(
              "relative",
              sortOrder === "newest" && "bg-background shadow-sm"
            )}
          >
            <Clock className="h-4 w-4 mr-2" />
            Newest
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortOrder("oldest")}
            className={cn(
              "relative",
              sortOrder === "oldest" && "bg-background shadow-sm"
            )}
          >
            <History className="h-4 w-4 mr-2" />
            Oldest
          </Button>
        </div>
      </div>
      <div className="space-y-4">
        {sortedTopLevelComments.map((comment) => (
          <ReviewCard
            key={comment.id}
            comment={comment}
            appId={appId}
            onReplyAdded={onReplyAdded}
          />
        ))}
      </div>
    </div>
  )
}

export function AppFeedback({ app }: { app: AppWithDetails }) {
  const [comments, setComments] = useState<AppComment[]>(app.comments)
  const user = useCurrentUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const userRating = useMemo(() => {
    if (!user) return 0
    const rating = app.ratings.find(r => r.userId === user.id)
    return rating?.rating || 0
  }, [app.ratings, user])

  const handleCommentAdded = (newComment: AppComment) => {
    setComments(prev => [newComment, ...prev])
  }

  const handleReplyAdded = (parentId: string, newReply: AppComment) => {
    setComments(prev => {
      const replyExists = prev.some(c => c.id === newReply.id)
      if (replyExists) return prev

      return prev.map(comment => {
        if (comment.id === parentId) {
          return {
            ...comment,
            replies: [...(comment.replies || []), newReply]
          }
        }
        return comment
      }).concat(newReply)
    })
  }

  const handleNewComment = async (values: { comment: string }) => {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      await new Promise(resolve => setTimeout(resolve, 100))

      const response = await fetch(`/api/apps/${app.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comment: values.comment }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit comment')
      }

      const newComment = await response.json()
      handleCommentAdded(newComment)
      toast({
        title: "Comment posted successfully",
      })
    } catch (error) {
      console.error('Error submitting comment:', error)
      toast({
        title: "Failed to post comment",
        description: "Please try again later",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Comments and Ratings Tabs */}
      <Tabs defaultValue="comments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="ratings">Ratings</TabsTrigger>
        </TabsList>
        <TabsContent value="comments" className="space-y-6">
          {/* Write a Comment section */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">Write a Comment</h2>
            <AppCommentForm 
              appId={app.id}
              onSubmit={handleNewComment}
              placeholder="Share your thoughts..."
              submitLabel={isSubmitting ? "Posting..." : "Post Comment"}
              minLength={1}
              disabled={isSubmitting}
            />
          </div>
          <CommentsSection
            appId={app.id}
            comments={comments}
            onCommentAdded={handleCommentAdded}
            onReplyAdded={handleReplyAdded}
          />
        </TabsContent>
        <TabsContent value="ratings" className="space-y-6">
          <RatingsSection
            appId={app.id}
            ratings={app.ratings}
            userRating={userRating}
            totalCount={app._count.ratings}
          />
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Recent Ratings</h3>
            <div className="space-y-4">
              {app.ratings.slice(0, 5).map((rating) => (
                <div key={rating.id} className="flex items-start gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={rating.user?.image || undefined} />
                    <AvatarFallback>{rating.user?.name?.[0] || 'A'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{rating.user?.name || 'Anonymous'}</p>
                      <div className="flex items-center">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "h-4 w-4",
                              i < rating.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(rating.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 