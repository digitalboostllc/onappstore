"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useCurrentUser } from "@/hooks/use-current-user"
import { Pencil } from "lucide-react"
import { AppRequirementsEdit } from "./app-requirements-edit"
import type { AppWithDetails } from "@/lib/services/app-service"

interface AppRequirementsProps {
  app: AppWithDetails
  onUpdate?: (updatedApp: AppWithDetails) => void
}

export function AppRequirements({ app: initialApp, onUpdate }: AppRequirementsProps) {
  const user = useCurrentUser()
  const [isEditing, setIsEditing] = useState(false)
  const [app, setApp] = useState(initialApp)

  const handleUpdate = (updatedApp: AppWithDetails) => {
    setApp(updatedApp)
    if (onUpdate) {
      onUpdate(updatedApp)
    }
  }

  if (!app.requirements && !app.otherRequirements && !user?.isAdmin) {
    return null
  }

  if (isEditing && user?.isAdmin) {
    return (
      <AppRequirementsEdit 
        app={app} 
        onCancel={() => setIsEditing(false)}
        onSave={handleUpdate}
      />
    )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-2xl font-bold tracking-tight">Requirements</h2>
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

        {app.requirements && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">System Requirements</h3>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              {app.requirements.split('\n').map((req, i) => (
                <p key={i} className="mb-1">{req}</p>
              ))}
            </div>
          </div>
        )}

        {app.otherRequirements && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Other Requirements</h3>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              {app.otherRequirements.split('\n').map((req, i) => (
                <p key={i} className="mb-1">{req}</p>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 