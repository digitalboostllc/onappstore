"use client"

import * as React from "react"
import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { toast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/icons"
import { cn } from "@/lib/utils"

interface FileUploadProps {
  accept?: string[]
  maxSize?: number
  maxFiles?: number
  onUpload: (files: File[]) => void
  className?: string
}

export function FileUpload({
  accept = ["*"],
  maxSize = 10 * 1024 * 1024, // 10MB
  maxFiles = 1,
  onUpload,
  className,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      try {
        setUploading(true)
        onUpload(acceptedFiles)
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to upload files. Please try again.",
          variant: "destructive",
        })
      } finally {
        setUploading(false)
      }
    },
    [onUpload]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize,
    maxFiles,
  })

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors",
        isDragActive && "border-primary bg-muted",
        className
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-2">
        <Icons.upload className="h-8 w-8 text-muted-foreground" />
        {isDragActive ? (
          <p>Drop the files here ...</p>
        ) : (
          <>
            <p>Drag & drop files here, or click to select files</p>
            <p className="text-sm text-muted-foreground">
              {maxFiles === 1
                ? "Upload 1 file"
                : `Upload up to ${maxFiles} files`}
              {" up to "}
              {Math.round(maxSize / 1024 / 1024)}MB
            </p>
          </>
        )}
        {uploading && (
          <div className="flex items-center gap-2">
            <Icons.spinner className="h-4 w-4 animate-spin" />
            <p>Uploading...</p>
          </div>
        )}
      </div>
    </div>
  )
} 