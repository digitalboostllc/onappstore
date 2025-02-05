"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Download, Flag, FolderPlus, Star, Twitter, Facebook, Link as LinkIcon, Check, Pencil, Save, X, CheckCircle, AlertCircle, ShoppingCart, Loader2, AlertTriangle, Trash2, Archive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useCurrentUser } from "@/hooks/use-current-user"
import { formatBytes, formatDate } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import type { AppWithDetails } from "@/lib/services/app-service"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

interface AppSidebarProps {
  app: AppWithDetails
  onUpdate?: (updatedApp: AppWithDetails) => void
}

interface EditableCardProps {
  title: string
  isEditing: boolean
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  isSaving: boolean
  children: React.ReactNode
}

function EditableCard({ title, isEditing, onEdit, onSave, onCancel, isSaving, children }: EditableCardProps) {
  const user = useCurrentUser()

  return (
    <Card className="bg-background shadow-sm">
      <CardHeader className="p-3 pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{title}</CardTitle>
          {user?.isAdmin && (
            isEditing ? (
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={onCancel}
                  disabled={isSaving}
                >
                  <X className="h-3 w-3" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={onSave}
                  disabled={isSaving}
                >
                  <Save className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onEdit}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-2">
        {children}
      </CardContent>
    </Card>
  )
}

export function AppSidebar({ app: initialApp, onUpdate }: AppSidebarProps) {
  const router = useRouter()
  const user = useCurrentUser()
  const [app, setApp] = useState(initialApp)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const latestVersion = app.version
  const [isReporting, setIsReporting] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const averageRating = app.averageRating || 0
  const totalRatings = app._count.ratings || 0
  const totalDownloads = app._count.downloads || 0
  const totalComments = app._count.comments || 0
  
  // Edit states
  const [vendor, setVendor] = useState(app.vendor || "")
  const [categoryId, setCategoryId] = useState(app.categoryId || "")
  const [subcategoryId, setSubcategoryId] = useState(app.subcategoryId || "")
  const [price, setPrice] = useState(app.price || "")
  const [license, setLicense] = useState(app.license || "")
  const [fileSize, setFileSize] = useState(app.fileSize?.toString() || "")
  const [bundleIds, setBundleIds] = useState(app.bundleIds?.join("\n") || "")
  const [isSupported, setIsSupported] = useState(app.isSupported)
  const [requirements, setRequirements] = useState(app.requirements || "")
  const [otherRequirements, setOtherRequirements] = useState(app.otherRequirements || "")
  const [releaseDate, setReleaseDate] = useState(
    app.releaseDate ? new Date(app.releaseDate).toISOString().split('T')[0] : ""
  )
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showUnpublishDialog, setShowUnpublishDialog] = useState(false)

  const handleShare = async (platform: string) => {
    const url = window.location.href
    const text = `Check out ${app.name} on MacApps Hub`

    switch (platform) {
      case "twitter":
        window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`)
        break
      case "facebook":
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`)
        break
      case "copy":
        await navigator.clipboard.writeText(url)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
        toast({
          title: "Link copied",
          description: "The link has been copied to your clipboard.",
        })
        break
    }
  }

  const handleReport = async () => {
    setIsReporting(true)
    try {
      await fetch(`/api/apps/${app.id}/report`, {
        method: "POST",
      })
      toast({
        title: "Report submitted",
        description: "Thank you for reporting this app. We will review it shortly.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsReporting(false)
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
          vendor,
          categoryId,
          subcategoryId,
          price,
          license,
          fileSize: fileSize ? BigInt(fileSize) : null,
          bundleIds: bundleIds.split('\n').filter(Boolean),
          isSupported,
          requirements,
          otherRequirements,
          releaseDate: releaseDate ? new Date(releaseDate) : null
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || 'Failed to update app specifications')
      }

      const updatedApp = await response.json()
      setApp(updatedApp)
      if (onUpdate) {
        onUpdate(updatedApp)
      }

      toast({
        title: "Success",
        description: "App specifications updated successfully",
      })

      setIsEditing(false)
    } catch (error) {
      console.error("Error updating app:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update app specifications. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setVendor(app.vendor || "")
    setCategoryId(app.categoryId || "")
    setSubcategoryId(app.subcategoryId || "")
    setPrice(app.price || "")
    setLicense(app.license || "")
    setFileSize(app.fileSize?.toString() || "")
    setBundleIds(app.bundleIds?.join("\n") || "")
    setIsSupported(app.isSupported)
    setRequirements(app.requirements || "")
    setOtherRequirements(app.otherRequirements || "")
    setReleaseDate(
      app.releaseDate ? new Date(app.releaseDate).toISOString().split('T')[0] : ""
    )
    setIsEditing(false)
  }

  const handleEdit = () => {
    // Set all edit states to current app values
    setVendor(app.vendor || "")
    setCategoryId(app.categoryId || "")
    setSubcategoryId(app.subcategoryId || "")
    setPrice(app.price || "")
    setLicense(app.license || "")
    setFileSize(app.fileSize?.toString() || "")
    setBundleIds(app.bundleIds?.join("\n") || "")
    setIsSupported(app.isSupported)
    setRequirements(app.requirements || "")
    setOtherRequirements(app.otherRequirements || "")
    setReleaseDate(app.releaseDate ? new Date(app.releaseDate).toISOString().split('T')[0] : "")
    setIsEditing(true)
  }

  const handleAction = async (action: string, confirmed = false) => {
    try {
      // Show confirmation dialogs if not already confirmed
      if (!confirmed) {
        if (action === "unpublish") {
          setShowUnpublishDialog(true)
          return
        }
        if (action === "delete") {
          setShowDeleteDialog(true)
          return
        }
      }

      setActionInProgress(action)

      // Optimistic update for publish/unpublish actions
      if (action === "approve" || action === "unpublish") {
        setApp(prev => ({
          ...prev,
          published: action === "approve"
        }))
      }

      const response = await fetch(`/api/admin/apps/${app.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      })

      if (!response.ok) {
        // Revert optimistic update
        if (action === "approve" || action === "unpublish") {
          setApp(prev => ({
            ...prev,
            published: !prev.published
          }))
        }
        const error = await response.text()
        throw new Error(error || `Failed to ${action} app`)
      }

      const updatedApp = await response.json()
      setApp(updatedApp)
      if (onUpdate) {
        onUpdate(updatedApp)
      }

      toast({
        title: action === "approve" ? "App Published" : "Action Completed",
        description: action === "approve" 
          ? "The app is now live and visible to all users"
          : `App ${action}ed successfully`,
      })

      // Close dialogs
      setShowUnpublishDialog(false)
      setShowDeleteDialog(false)

      // Handle post-action navigation/refresh
      if (action === "delete") {
        router.push("/admin/apps")
      } else if (action === "approve" || action === "unpublish") {
        // Refresh the page to update all UI components
        router.refresh()
      }
    } catch (error) {
      console.error(`Error ${action}ing app:`, error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${action} app. Please try again.`,
        variant: "destructive",
      })
    } finally {
      setActionInProgress(null)
    }
  }

  return (
    <div className="space-y-3">
      {/* Download/Purchase Section */}
      <Card className="bg-background shadow-sm">
        <CardContent className="p-3">
          <div className="space-y-2">
            {app.downloadUrl && (
              <Button asChild className="w-full">
                <Link href={app.downloadUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Link>
              </Button>
            )}
            {app.purchaseUrl ? (
              <Button 
                asChild 
                variant={app.downloadUrl ? "outline" : "default"} 
                className={cn(
                  "w-full",
                  app.downloadUrl 
                    ? "border-indigo-500 hover:bg-indigo-50 text-indigo-600 hover:text-indigo-700 dark:border-indigo-700 dark:hover:bg-indigo-900/20 dark:text-indigo-500 dark:hover:text-indigo-400" 
                    : "bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-700 dark:hover:bg-indigo-600"
                )}
              >
                <Link href={app.purchaseUrl} target="_blank" rel="noopener noreferrer">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {app.price === "Free" ? "Free" : app.price ? `Buy ${app.price}` : "Buy"}
                </Link>
              </Button>
            ) : !app.downloadUrl && (
              <Button className="w-full" disabled>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Not Available
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* App Specs */}
      <EditableCard
        title="App Specs"
        isEditing={isEditing}
        onEdit={handleEdit}
        onSave={handleSave}
        onCancel={handleCancel}
        isSaving={isSaving}
      >
        {isEditing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Vendor</Label>
              <Input
                className="h-8 text-sm"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Price</Label>
              <Input
                className="h-8 text-sm"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">License</Label>
              <Input
                className="h-8 text-sm"
                value={license}
                onChange={(e) => setLicense(e.target.value)}
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">File Size (in bytes)</Label>
              <Input
                className="h-8 text-sm"
                type="number"
                value={fileSize}
                onChange={(e) => setFileSize(e.target.value)}
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Bundle IDs (one per line)</Label>
              <Textarea
                className="text-sm"
                value={bundleIds}
                onChange={(e) => setBundleIds(e.target.value)}
                disabled={isSaving}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={isSupported}
                onCheckedChange={setIsSupported}
                disabled={isSaving}
              />
              <Label className="text-sm">App is actively supported</Label>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">System Requirements</Label>
              <Textarea
                className="text-sm"
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                disabled={isSaving}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Other Requirements</Label>
              <Textarea
                className="text-sm"
                value={otherRequirements}
                onChange={(e) => setOtherRequirements(e.target.value)}
                disabled={isSaving}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Release Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-8",
                      !releaseDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {releaseDate ? format(new Date(releaseDate), "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={releaseDate ? new Date(releaseDate) : undefined}
                    onSelect={(date) => setReleaseDate(date ? date.toISOString().split('T')[0] : '')}
                    disabled={isSaving}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        ) : (
          <dl className="divide-y divide-border">
            <div className="space-y-3 pb-3">
              {app.vendor && (
                <div className="space-y-1.5">
                  <dt className="text-sm font-medium text-muted-foreground">Vendor</dt>
                  <dd className="flex items-center gap-1 min-w-0">
                    <span className="truncate text-sm">{app.vendor}</span>
                  </dd>
                </div>
              )}

              {app.price && (
                <div className="flex items-center gap-4">
                  <dt className="text-sm font-medium text-muted-foreground shrink-0">Price</dt>
                  <dd>
                    <Badge variant="outline" className="text-sm font-normal bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-900">
                      {app.price}
                    </Badge>
                  </dd>
                </div>
              )}

              {app.license && (
                <div className="flex items-center gap-4">
                  <dt className="text-sm font-medium text-muted-foreground shrink-0">License</dt>
                  <dd className="min-w-0">
                    <Badge variant="secondary" className="text-sm font-normal max-w-full truncate">
                      {app.license}
                    </Badge>
                  </dd>
                </div>
              )}

              {app.fileSize && (
                <div className="flex items-center gap-4">
                  <dt className="text-sm font-medium text-muted-foreground shrink-0">Size</dt>
                  <dd className="flex items-center gap-1 text-sm">
                    <FolderPlus className="h-3 w-3 text-muted-foreground" />
                    {formatBytes(Number(app.fileSize))}
                  </dd>
                </div>
              )}

              {app.isSupported !== undefined && (
                <div className="flex items-center gap-4">
                  <dt className="text-sm font-medium text-muted-foreground shrink-0">Support Status</dt>
                  <dd>
                    {app.isSupported ? (
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" />
                    )}
                  </dd>
                </div>
              )}

              {app.releaseDate && (
                <div className="flex items-center gap-4">
                  <dt className="text-sm font-medium text-muted-foreground shrink-0">Released</dt>
                  <dd>
                    <Badge variant="outline" className="text-sm font-normal">
                      {formatDate(new Date(app.releaseDate).toISOString())}
                    </Badge>
                  </dd>
                </div>
              )}
            </div>

            {app.bundleIds && app.bundleIds.length > 0 && (
              <div className="space-y-2 py-3">
                <dt className="text-sm font-medium text-muted-foreground">Bundle IDs</dt>
                <dd className="space-y-1">
                  {app.bundleIds.map((id, index) => (
                    <code key={index} className="text-sm bg-muted px-1.5 py-0.5 rounded block break-all">
                      {id}
                    </code>
                  ))}
                </dd>
              </div>
            )}

            {(app.requirements || app.otherRequirements) && (
              <div className="space-y-3 pt-3">
                {app.requirements && (
                  <div className="space-y-2">
                    <dt className="text-sm font-medium text-muted-foreground">System Requirements</dt>
                    <dd className="space-y-1 bg-muted p-2 rounded-md">
                      {app.requirements.split('\n').map((req, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-foreground/50 shrink-0" />
                          <div className="text-sm break-words">{req}</div>
                        </div>
                      ))}
                    </dd>
                  </div>
                )}

                {app.otherRequirements && (
                  <div className="space-y-2">
                    <dt className="text-sm font-medium text-muted-foreground">Other Requirements</dt>
                    <dd className="space-y-1 bg-muted/50 p-2 rounded-md">
                      {app.otherRequirements.split('\n').map((req, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-foreground/30 shrink-0" />
                          <div className="text-sm break-words">{req}</div>
                        </div>
                      ))}
                    </dd>
                  </div>
                )}
              </div>
            )}
          </dl>
        )}
      </EditableCard>

      <Card className="bg-background shadow-sm">
        <CardHeader className="p-3 pb-0">
          <CardTitle className="text-sm">Share</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="flex items-center justify-center rounded-md bg-muted p-1 gap-1">
            <Button 
              variant="ghost" 
              size="icon"
              className="h-7 w-7 hover:bg-background"
              onClick={() => handleShare("twitter")}
            >
              <Twitter className="h-3 w-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-7 w-7 hover:bg-background"
              onClick={() => handleShare("facebook")}
            >
              <Facebook className="h-3 w-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-7 w-7 hover:bg-background"
              onClick={() => handleShare("copy")}
            >
              {isCopied ? (
                <Check className="h-3 w-3" />
              ) : (
                <LinkIcon className="h-3 w-3" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-background shadow-sm">
        <CardHeader className="p-3 pb-0">
          <CardTitle className="text-sm">Statistics</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-2">
          <div className="grid gap-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Downloads</span>
              <span className="font-medium">{totalDownloads}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Comments</span>
              <span className="font-medium">{totalComments}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Rating</span>
              <span className="font-medium flex items-center">
                <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                {averageRating.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Created</span>
              <span className="font-medium">{formatDate(new Date(app.createdAt).toISOString())}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Last Updated</span>
              <span className="font-medium">{formatDate(new Date(app.updatedAt).toISOString())}</span>
            </div>
            {user?.isAdmin && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={app.published ? "default" : "secondary"} className="text-sm">
                  {app.published ? "Published" : "Draft"}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {user?.isAdmin && (
        <Card className="bg-background shadow-sm">
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-sm">Admin Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-2">
            <div className="space-y-2">
              {!app.published ? (
                <Button
                  variant="default"
                  size="sm"
                  className="w-full"
                  onClick={() => handleAction("approve")}
                  disabled={!!actionInProgress}
                >
                  {actionInProgress === "approve" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Publish
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleAction("unpublish")}
                  disabled={!!actionInProgress}
                >
                  {actionInProgress === "unpublish" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Unpublishing...
                    </>
                  ) : (
                    <>
                      <Archive className="mr-2 h-4 w-4" />
                      Unpublish
                    </>
                  )}
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => handleAction("delete")}
                disabled={!!actionInProgress}
              >
                {actionInProgress === "delete" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unpublish Dialog */}
      <AlertDialog open={showUnpublishDialog} onOpenChange={setShowUnpublishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Unpublish {app.name}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will make the app invisible to regular users. You can publish it again at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <div className="border rounded-lg p-4 bg-muted/50">
              <h4 className="text-sm font-medium mb-3">Current Statistics</h4>
              <div className="grid gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Downloads</span>
                  <span className="font-medium">{totalDownloads}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Active Users</span>
                  <span className="font-medium">{totalDownloads}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Rating</span>
                  <span className="font-medium flex items-center">
                    <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                    {averageRating.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!actionInProgress}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleAction("unpublish", true)}
              disabled={!!actionInProgress}
              className="border hover:bg-accent hover:text-accent-foreground"
            >
              {actionInProgress === "unpublish" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Unpublishing...
                </>
              ) : (
                <>
                  <Archive className="mr-2 h-4 w-4" />
                  Confirm Unpublish
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete {app.name}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this app
              and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <ul className="list-disc pl-4 text-sm space-y-1 text-muted-foreground">
              <li>App information and metadata</li>
              <li>All versions and files</li>
              <li>User ratings and reviews</li>
              <li>Download statistics</li>
              <li>Screenshots and media</li>
            </ul>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!actionInProgress}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleAction("delete", true)}
              disabled={!!actionInProgress}
              className="bg-destructive hover:bg-destructive/90"
            >
              {actionInProgress === "delete" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete App
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 