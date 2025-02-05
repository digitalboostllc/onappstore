'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { handleSyncMacUpdateCategories } from '../actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Eye, RefreshCw, AlertTriangle, Link } from 'lucide-react'
import { type CategoryChange } from '@/lib/sync-categories'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function SyncCategories() {
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [isSyncLoading, setIsSyncLoading] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [appUrl, setAppUrl] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)
  const [changes, setChanges] = useState<CategoryChange[]>([])
  const [summary, setSummary] = useState<{
    create: number
    update: number
    unchanged: number
  } | null>(null)

  const validateUrl = (url: string) => {
    if (!url) {
      setUrlError('Please provide a MacUpdate app URL')
      return false
    }
    try {
      const parsedUrl = new URL(url)
      if (parsedUrl.hostname !== 'www.macupdate.com' || !parsedUrl.pathname.startsWith('/app/mac/') || parsedUrl.pathname.endsWith('/app/mac/')) {
        setUrlError('Please provide a valid MacUpdate app URL (e.g., https://www.macupdate.com/app/mac/...)')
        return false
      }
      setUrlError(null)
      return true
    } catch {
      setUrlError('Please provide a valid URL')
      return false
    }
  }

  const handlePreview = async () => {
    if (!validateUrl(appUrl)) return

    try {
      setIsPreviewLoading(true)
      setIsPreviewing(true)
      const result = await handleSyncMacUpdateCategories({ preview: true, appUrl })
      setChanges(result.preview.changes)
      setSummary(result.preview.summary)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to preview changes')
    } finally {
      setIsPreviewLoading(false)
      setIsPreviewing(false)
    }
  }

  const handleSync = async () => {
    if (!validateUrl(appUrl)) return

    try {
      setIsSyncLoading(true)
      const result = await handleSyncMacUpdateCategories({ preview: false, appUrl })
      setChanges(result.changes || [])
      setSummary(result.summary || null)
      toast.success('Categories synced successfully')
      setShowConfirmDialog(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to sync categories')
    } finally {
      setIsSyncLoading(false)
    }
  }

  const hasChanges = summary && (summary.create > 0 || summary.update > 0)

  return (
    <>
      <Card className="bg-primary/5 border-primary/10">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            <CardTitle>Sync Categories</CardTitle>
          </div>
          <CardDescription className="text-muted-foreground/80">
            Synchronize categories with MacUpdate&apos;s category structure. This will create new categories
            and update existing ones to match MacUpdate&apos;s hierarchy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="space-y-4">
            <div className="grid w-full gap-2">
              <Label htmlFor="appUrl">MacUpdate App URL</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    id="appUrl"
                    placeholder="https://www.macupdate.com/app/mac/..."
                    value={appUrl}
                    onChange={(e) => {
                      setAppUrl(e.target.value)
                      validateUrl(e.target.value)
                    }}
                    className={urlError ? 'border-red-500' : ''}
                    required
                  />
                  {urlError && (
                    <p className="text-sm text-red-500 mt-1">{urlError}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(appUrl || 'https://www.macupdate.com', '_blank')}
                  disabled={!appUrl}
                >
                  <Link className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Provide a MacUpdate app URL to fetch the category structure from (e.g., https://www.macupdate.com/app/mac/51283/wondershare-mobiletrans).
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Button
                onClick={handlePreview}
                disabled={isPreviewLoading || isSyncLoading || !appUrl || !!urlError}
              >
                {isPreviewLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Previewing...
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Preview Changes
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(true)}
                disabled={isPreviewLoading || isSyncLoading || !appUrl || !!urlError || changes.length === 0}
              >
                {isSyncLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Categories
                  </>
                )}
              </Button>
              {summary && (
                <div className="flex gap-2">
                  <Badge variant="default">{summary.create} Created</Badge>
                  <Badge variant="secondary">{summary.update} Updated</Badge>
                  <Badge variant="outline">{summary.unchanged} Unchanged</Badge>
                </div>
              )}
            </div>
          </div>

          {changes.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">
                {isPreviewLoading ? 'Recent Changes' : isPreviewing ? 'Preview Changes' : 'Recent Changes'}
              </h3>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {changes.map((change, index) => (
                  <div
                    key={index}
                    className="text-sm border rounded-lg p-2 flex items-start gap-2"
                  >
                    <Badge
                      variant={
                        change.type === 'create'
                          ? 'default'
                          : change.type === 'update'
                          ? 'secondary'
                          : 'outline'
                      }
                      className="mt-0.5"
                    >
                      {change.type}
                    </Badge>
                    <div>
                      <p className="font-medium">
                        {change.name}
                        {change.parentName && (
                          <span className="text-muted-foreground"> (under {change.parentName})</span>
                        )}
                      </p>
                      {change.description && <p className="text-muted-foreground">{change.description}</p>}
                      {change.type === 'update' && change.oldValues && (
                        <div className="text-muted-foreground mt-1">
                          <p>Previous values:</p>
                          <ul className="list-disc list-inside">
                            {change.oldValues.description !== change.description && (
                              <li>Description: {change.oldValues.description || 'None'}</li>
                            )}
                            {change.oldValues.parentId !== undefined && (
                              <li>Parent: {change.oldValues.parentId || 'None'}</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Category Sync</DialogTitle>
            <DialogDescription>
              Are you sure you want to sync categories with MacUpdate? This action will update your category structure.
            </DialogDescription>
          </DialogHeader>

          {summary && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge variant="default">{summary.create} to be created</Badge>
                <Badge variant="secondary">{summary.update} to be updated</Badge>
                <Badge variant="outline">{summary.unchanged} unchanged</Badge>
              </div>

              {(summary.create > 0 || summary.update > 0) && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Important</AlertTitle>
                  <AlertDescription>
                    This will {summary.create > 0 ? `create ${summary.create} new categories` : ''} 
                    {summary.create > 0 && summary.update > 0 ? ' and ' : ''}
                    {summary.update > 0 ? `update ${summary.update} existing categories` : ''}.
                    Please make sure you have previewed the changes before proceeding.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSync} disabled={isSyncLoading}>
              {isSyncLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Sync
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 