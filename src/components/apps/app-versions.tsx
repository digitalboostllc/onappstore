"use client"

import { useState } from "react"
import { formatBytes, formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { useCurrentUser } from "@/hooks/use-current-user"
import { Upload, Loader2, X, ChevronDown, ChevronUp } from "lucide-react"
import type { AppWithDetails } from "@/lib/services/app-service"

interface AppVersionsProps {
  app: AppWithDetails & {
    versions?: {
      id: string
      version: string
      changelog: string | null
      createdAt: Date
      fileUrl: string
      fileSize: bigint
      sha256Hash: string
      minOsVersion: string
      _count: {
        downloads: number
      }
    }[]
  }
  onUpdate?: (updatedApp: AppWithDetails) => void
}

interface VersionFormData {
  version: string
  changelog: string
  file: File | null
}

export function AppVersions({ app: initialApp, onUpdate }: AppVersionsProps) {
  const user = useCurrentUser()
  const [app, setApp] = useState(initialApp)
  const [isAddingVersion, setIsAddingVersion] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [expandedVersions, setExpandedVersions] = useState<string[]>([])
  const [formData, setFormData] = useState<VersionFormData>({
    version: "",
    changelog: "",
    file: null,
  })
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [requirements, setRequirements] = useState(app.versions?.[0]?.changelog ?? "")

  const toggleVersion = (versionId: string) => {
    setExpandedVersions(prev => 
      prev.includes(versionId)
        ? prev.filter(id => id !== versionId)
        : [...prev, versionId]
    )
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (![".app", ".dmg", ".zip"].some(ext => file.name.toLowerCase().endsWith(ext))) {
      toast({
        title: "Error",
        description: "Please upload a .app, .dmg, or .zip file.",
        variant: "destructive",
      })
      return
    }

    if (file.size > 500 * 1024 * 1024) { // 500MB
      toast({
        title: "Error",
        description: "File size should be less than 500MB.",
        variant: "destructive",
      })
      return
    }

    setFormData(prev => ({ ...prev, file }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.file) {
      toast({
        title: "Error",
        description: "Please select a file to upload.",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    try {
      // Upload app file
      const appFormData = new FormData()
      appFormData.append("file", formData.file)
      const appResponse = await fetch("/api/upload/app", {
        method: "POST",
        body: appFormData,
      })
      if (!appResponse.ok) throw new Error("Failed to upload app file")
      const { url: appUrl } = await appResponse.json()

      // Create new version
      const response = await fetch(`/api/admin/apps/${app.id}/versions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: formData.version,
          changelog: formData.changelog,
          file: appUrl,
          fileSize: formData.file.size,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create version")
      }

      toast({
        title: "Success",
        description: "New version created successfully",
      })

      // Reset form and refresh page
      setFormData({
        version: "",
        changelog: "",
        file: null,
      })
      setIsAddingVersion(false)
      const updatedApp = await response.json()
      setApp(updatedApp)
      if (onUpdate) {
        onUpdate(updatedApp)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create version. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/admin/apps/${app.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requirements,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || 'Failed to update requirements')
      }

      const updatedApp = await response.json()
      setApp(updatedApp)
      if (onUpdate) {
        onUpdate(updatedApp)
      }

      toast({
        title: "Success",
        description: "Requirements updated successfully",
      })

      setIsEditing(false)
    } catch (error) {
      console.error("Error updating requirements:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update requirements. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setRequirements(app.versions?.[0]?.changelog ?? "")
    setIsEditing(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Version History</h2>
        {user?.isAdmin && !isAddingVersion && (
          <Button
            variant="outline"
            onClick={() => setIsAddingVersion(true)}
          >
            Add Version
          </Button>
        )}
      </div>

      {isAddingVersion && user?.isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add New Version</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="version">Version Number</Label>
                <Input
                  id="version"
                  placeholder="e.g. 1.0.0"
                  value={formData.version}
                  onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="changelog">Changelog</Label>
                <Textarea
                  id="changelog"
                  placeholder="What's new in this version?"
                  value={formData.changelog}
                  onChange={(e) => setFormData(prev => ({ ...prev, changelog: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">App File</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("file")?.click()}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {formData.file ? formData.file.name : "Select File"}
                  </Button>
                  {formData.file && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setFormData(prev => ({ ...prev, file: null }))}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <input
                  id="file"
                  type="file"
                  accept=".app,.dmg,.zip"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <p className="text-xs text-muted-foreground">
                  Upload your app (.app, .dmg, or .zip). Maximum size: 500MB
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsAddingVersion(false)}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUploading || !formData.file}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Create Version"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {app.versions?.map((version) => (
          <Card key={version.id}>
            <CardHeader className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">Version {version.version}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Released {formatDate(version.createdAt)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleVersion(version.id)}
                >
                  {expandedVersions.includes(version.id) ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            {expandedVersions.includes(version.id) && (
              <CardContent className="px-4 pb-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-1">File Details</h4>
                    <p className="text-sm text-muted-foreground">
                      Size: {formatBytes(Number(version.fileSize))}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Changelog</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {version.changelog || "No changelog available"}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Downloads</h4>
                    <p className="text-sm text-muted-foreground">
                      {version._count?.downloads || 0} downloads
                    </p>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
} 