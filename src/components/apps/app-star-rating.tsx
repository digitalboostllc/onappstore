"use client"

import { useState, useEffect } from "react"
import { Star } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface AppStarRatingProps {
  appId: string
  currentRating: number
  averageRating: number
  totalRatings: number
}

export function AppStarRating({
  appId,
  currentRating: initialRating,
  averageRating: initialAverage,
  totalRatings: initialTotal,
}: AppStarRatingProps) {
  const [hoveredRating, setHoveredRating] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentRating, setCurrentRating] = useState(initialRating)
  const [averageRating, setAverageRating] = useState(initialAverage || 0)
  const [totalRatings, setTotalRatings] = useState(initialTotal || 0)

  // Update local state when props change (e.g. after page refresh)
  useEffect(() => {
    console.log('[RATING_TRACK] Props updated:', {
      initialRating,
      initialAverage,
      initialTotal
    })
    setCurrentRating(initialRating)
    setAverageRating(initialAverage || 0)
    setTotalRatings(initialTotal || 0)
  }, [initialRating, initialAverage, initialTotal])

  const handleRatingSubmit = async (rating: number) => {
    console.log('[RATING_TRACK] Rating submission started:', {
      appId,
      rating,
      currentRating,
      isSubmitting
    })

    if (isSubmitting) {
      console.log('[RATING_TRACK] Submission already in progress')
      return
    }

    setIsSubmitting(true)

    try {
      console.log('[RATING_TRACK] Making API request:', {
        method: currentRating ? "PUT" : "POST",
        rating
      })

      const response = await fetch(`/api/apps/${appId}/ratings`, {
        method: currentRating ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rating }),
      })

      if (!response.ok) {
        throw new Error("Failed to submit rating")
      }

      // Get updated stats from response
      const data = await response.json()
      console.log('[RATING_TRACK] API response:', data)
      
      // Update local state with server data
      setCurrentRating(rating)
      setAverageRating(data.averageRating || 0)
      setTotalRatings(data.totalRatings || 0)

      toast({
        title: currentRating ? "Rating updated" : "Rating submitted",
        description: "Thank you for your feedback!",
      })
    } catch (error) {
      console.error('[RATING_TRACK] Error:', error)
      toast({
        title: "Error",
        description: "Failed to submit rating. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              className="p-1 hover:scale-110 transition-transform"
              onMouseEnter={() => setHoveredRating(rating)}
              onMouseLeave={() => setHoveredRating(0)}
              onClick={() => handleRatingSubmit(rating)}
              disabled={isSubmitting}
            >
              <Star
                className={`h-6 w-6 ${
                  rating <= (hoveredRating || currentRating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="text-sm text-muted-foreground">
        Average rating: {averageRating.toFixed(1)} ({totalRatings} {totalRatings === 1 ? "rating" : "ratings"})
      </div>
    </div>
  )
} 