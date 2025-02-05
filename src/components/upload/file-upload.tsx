"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { FileIcon, X } from "lucide-react"
import { formatBytes } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"

interface FileUploadProps {
  endpoint: string
  maxSize?: number
  accept?: string
  onUpload?: (data: { url: string; key: string }) => void
}

export function FileUpload({
  endpoint,
  maxSize = 1024 * 1024 * 50, // 50MB
  accept,
  onUpload,
}: FileUploadProps) {
  const [isPending, startTransition] = React.useTransition()
  const router = useRouter()

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) return

    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: `File size should be less than ${formatBytes(maxSize)}`,
        variant: "destructive",
      })
      return
    }

    const formData = new FormData()
    formData.append("file", file)

    startTransition(async () => {
      try {
        const response = await fetch(`/api/upload/${endpoint}`, {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error("Upload failed")
        }

        const data = await response.json()
        onUpload?.(data)
        router.refresh()

        toast({
          title: "Upload successful",
          description: "Your file has been uploaded.",
        })
      } catch (error) {
        toast({
          title: "Something went wrong",
          description: "Please try again.",
          variant: "destructive",
        })
      }
    })
  }

  return (
    <div className="grid w-full items-center gap-1.5">
      <label
        htmlFor="file"
        className="relative flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-muted/25 px-5 py-4 text-center transition-colors hover:bg-muted/50"
      >
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <FileIcon className="h-4 w-4" />
          <span>
            {isPending ? "Uploading..." : "Click to upload or drag and drop"}
          </span>
        </div>
        <input
          id="file"
          type="file"
          accept={accept}
          className="sr-only"
          onChange={handleFileUpload}
          disabled={isPending}
        />
      </label>
      <p className="text-xs text-muted-foreground">
        Max file size: {formatBytes(maxSize)}
      </p>
    </div>
  )
} 