"use client"

import { useState } from "react"
import * as LucideIcons from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { LucideIcon } from 'lucide-react'
import { Wand2, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface IconPickerProps {
  value?: string
  onChange?: (value: string) => void
  categoryName?: string
  description?: string
}

export function IconPicker({ value, onChange, categoryName, description }: IconPickerProps) {
  const [isLoading, setIsLoading] = useState(false)

  // Get the selected icon component if value exists
  const SelectedIcon = value ? LucideIcons[value as keyof typeof LucideIcons] as LucideIcon : undefined

  const handleSuggestIcon = async () => {
    if (!categoryName) {
      toast.error("Please enter a category name first to get an AI suggestion")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/suggest-icon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          categoryName,
          description: description || undefined 
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get icon suggestion")
      }

      const data = await response.json()
      if (data.suggestedIcon && LucideIcons[data.suggestedIcon as keyof typeof LucideIcons]) {
        onChange?.(data.suggestedIcon)
        toast.success("Icon suggested by AI")
      } else {
        toast.error("Invalid icon suggestion received")
      }
    } catch (error) {
      console.error("Error suggesting icon:", error)
      toast.error("Failed to get AI suggestion")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex gap-2">
      <div className="flex h-10 w-full items-center gap-2 rounded-md border bg-background px-3">
        {SelectedIcon ? (
          <>
            <SelectedIcon className="h-4 w-4" />
            <span className="text-sm">{value}</span>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">No icon selected</span>
        )}
      </div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={handleSuggestIcon}
              disabled={isLoading}
              className="shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{categoryName ? "Get AI suggestion based on name & description" : "Enter category name first"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
} 
