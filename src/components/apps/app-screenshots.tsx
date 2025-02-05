"use client"

import { useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, Upload, Loader2, X, GripVertical } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useCurrentUser } from "@/hooks/use-current-user"
import { toast } from "@/hooks/use-toast"
import type { AppWithDetails } from "@/lib/services/app-service"

function cleanUrl(url: string): string {
  return encodeURI(url.trim())
}

interface AppScreenshotsProps {
  app: AppWithDetails
  onUpdate?: (updatedApp: AppWithDetails) => void
}

export function AppScreenshots({ app: initialApp, onUpdate }: AppScreenshotsProps) {
  const user = useCurrentUser()
  const [app, setApp] = useState(initialApp)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // Clean screenshot URLs and filter out any invalid ones
  const [screenshots, setScreenshots] = useState(app.screenshots?.filter(Boolean).map(cleanUrl) || [])

  const handleSave = async (newScreenshots: string[]) => {
    try {
      const response = await fetch(`/api/admin/apps/${app.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          screenshots: newScreenshots.filter(Boolean),
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || 'Failed to update screenshots')
      }

      const updatedApp = await response.json()
      setApp(updatedApp)
      setScreenshots(updatedApp.screenshots || [])
      if (onUpdate) {
        onUpdate(updatedApp)
      }

      toast({
        title: "Success",
        description: "Screenshots updated successfully",
      })
    } catch (error) {
      console.error("Error updating screenshots:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update screenshots. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload/screenshot', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload screenshot')
      }

      const { url } = await response.json()
      const newScreenshots = [...screenshots, url]
      await handleSave(newScreenshots)
    } catch (error) {
      console.error("Error uploading screenshot:", error)
      toast({
        title: "Error",
        description: "Failed to upload screenshot. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (index: number) => {
    const newScreenshots = screenshots.filter((_, i) => i !== index)
    await handleSave(newScreenshots)
    if (currentIndex >= newScreenshots.length) {
      setCurrentIndex(Math.max(0, newScreenshots.length - 1))
    }
  }

  const handleDragStart = (index: number) => {
    setIsDragging(true)
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newScreenshots = [...screenshots]
    const draggedScreenshot = newScreenshots[draggedIndex]
    newScreenshots.splice(draggedIndex, 1)
    newScreenshots.splice(index, 0, draggedScreenshot)
    
    setScreenshots(newScreenshots)
    setDraggedIndex(index)
  }

  const handleDragEnd = async () => {
    setIsDragging(false)
    setDraggedIndex(null)

    try {
      await handleSave(screenshots.filter(Boolean))
    } catch (error) {
      console.error("Error updating screenshots:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update screenshot order. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (!screenshots.length && !user?.isAdmin) {
    return null
  }

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === screenshots.length - 1 ? 0 : prevIndex + 1
    )
  }

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? screenshots.length - 1 : prevIndex - 1
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col">
            {screenshots.length > 0 ? (
              <div className="relative w-full" style={{ minHeight: '500px' }}>
                <Image
                  src={screenshots[currentIndex]}
                  alt={`${app.name} screenshot ${currentIndex + 1}`}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1400px"
                  className="object-contain rounded-lg"
                  priority={currentIndex === 0}
                />
                
                {screenshots.length > 1 && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm hover:bg-background/90"
                      onClick={(e) => {
                        e.stopPropagation();
                        prevSlide();
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm hover:bg-background/90"
                      onClick={(e) => {
                        e.stopPropagation();
                        nextSlide();
                      }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1 rounded-full bg-background/80 backdrop-blur-sm">
                      {screenshots.map((_, index) => (
                        <button
                          key={index}
                          className={`w-1.5 h-1.5 rounded-full transition-colors ${
                            index === currentIndex ? 'bg-primary' : 'bg-muted-foreground/50 hover:bg-muted-foreground'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentIndex(index);
                          }}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : user?.isAdmin ? (
              <div className="flex items-center justify-center w-full h-[500px] border-2 border-dashed rounded-lg">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold">No screenshots</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Upload screenshots to showcase your app
                  </p>
                </div>
              </div>
            ) : null}

            {screenshots.length > 0 && (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                {screenshots.map((screenshot, index) => (
                  <div
                    key={screenshot}
                    draggable={user?.isAdmin}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`relative group flex flex-col items-center gap-2 ${
                      isDragging ? 'cursor-grabbing' : user?.isAdmin ? 'cursor-grab' : ''
                    }`}
                  >
                    <button
                      onClick={() => setCurrentIndex(index)}
                      className={`relative h-20 w-32 flex-none overflow-hidden rounded-md ${
                        index === currentIndex ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100"
                      } transition-opacity`}
                    >
                      <Image
                        src={screenshot}
                        alt={`${app.name} thumbnail ${index + 1}`}
                        fill
                        sizes="128px"
                        className="object-cover"
                      />
                    </button>
                    {user?.isAdmin && (
                      <div className="flex gap-1 p-1 rounded-md bg-muted">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-primary"
                        >
                          <GripVertical className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(index)
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {user?.isAdmin && (
              <div className="mt-4">
                <input
                  id="screenshot-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleUpload}
                  disabled={isUploading}
                />
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={isUploading}
                  onClick={() => document.getElementById('screenshot-upload')?.click()}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Screenshots
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 