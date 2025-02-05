"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useCurrentUser } from "@/hooks/use-current-user"
import { Pencil } from "lucide-react"
import { AppSpecsEdit } from "./app-specs-edit"
import type { AppWithDetails } from "@/lib/services/app-service"
import { formatBytes, formatDate } from "@/lib/utils"
import { CategoryWithStats } from "@/lib/categories"

interface AppSpecsProps {
  app: AppWithDetails
  categories: CategoryWithStats[]
  onUpdate?: (updatedApp: AppWithDetails) => void
}

export function AppSpecs({ app: initialApp, categories, onUpdate }: AppSpecsProps) {
  const user = useCurrentUser()
  const [isEditing, setIsEditing] = useState(false)
  const [app, setApp] = useState(initialApp)

  const handleUpdate = (updatedApp: AppWithDetails) => {
    setApp(updatedApp)
    if (onUpdate) {
      onUpdate(updatedApp)
    }
  }

  if (isEditing && user?.isAdmin) {
    return (
      <AppSpecsEdit 
        app={app} 
        categories={categories}
        onCancel={() => setIsEditing(false)}
        onSave={handleUpdate}
      />
    )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-2xl font-bold tracking-tight">App Specifications</h2>
          {user?.isAdmin && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>

        <dl className="space-y-4">
          {app.vendor && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Vendor</dt>
              <dd className="text-sm">{app.vendor}</dd>
            </div>
          )}

          {app.category && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Category</dt>
              <dd className="text-sm">
                {app.category.name}
                {app.subcategory && (
                  <> • {app.subcategory.name}</>
                )}
              </dd>
            </div>
          )}

          {app.price && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Price</dt>
              <dd className="text-sm">{app.price}</dd>
            </div>
          )}

          {app.license && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">License</dt>
              <dd className="text-sm">{app.license}</dd>
            </div>
          )}

          {app.fileSize && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Size</dt>
              <dd className="text-sm">{formatBytes(Number(app.fileSize))}</dd>
            </div>
          )}

          {app.bundleIds && app.bundleIds.length > 0 && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Bundle IDs</dt>
              <dd className="text-sm space-y-1">
                {app.bundleIds.map((id, index) => (
                  <div key={index}>{id}</div>
                ))}
              </dd>
            </div>
          )}

          {app.isSupported !== undefined && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Support Status</dt>
              <dd className="text-sm">
                {app.isSupported ? "This app is actively supported" : "This app is no longer supported"}
              </dd>
            </div>
          )}

          {app.requirements && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">System Requirements</dt>
              <dd className="text-sm whitespace-pre-line">{app.requirements}</dd>
            </div>
          )}

          {app.otherRequirements && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Other Requirements</dt>
              <dd className="text-sm whitespace-pre-line">{app.otherRequirements}</dd>
            </div>
          )}

          {app.releaseDate && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Release Date</dt>
              <dd className="text-sm">{formatDate(app.releaseDate.toISOString())}</dd>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  )
} 