"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { Save, X } from "lucide-react"
import type { AppWithDetails } from "@/lib/services/app-service"

interface AppRequirementsEditProps {
  app: AppWithDetails
  onCancel: () => void
  onSave?: (updatedApp: AppWithDetails) => void
}

export function AppRequirementsEdit({ app, onCancel, onSave }: AppRequirementsEditProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [requirements, setRequirements] = useState(app.requirements || "")
  const [otherRequirements, setOtherRequirements] = useState(app.otherRequirements || "")

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
          otherRequirements
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || 'Failed to update app requirements')
      }

      const updatedApp = await response.json()

      toast({
        title: "Success",
        description: "App requirements updated successfully",
      })
      
      if (onSave) {
        onSave(updatedApp)
      }
      
      onCancel()
    } catch (error) {
      console.error("Error updating app:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update app requirements. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Requirements</CardTitle>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={onCancel}
            disabled={isSaving}
          >
            <X className="h-4 w-4" />
          </Button>
          <Button 
            variant="default" 
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">System Requirements</label>
          <Textarea
            placeholder="Enter system requirements..."
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            disabled={isSaving}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            Enter system requirements like OS version, memory, storage, etc. One requirement per line.
          </p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Other Requirements</label>
          <Textarea
            placeholder="Enter other requirements..."
            value={otherRequirements}
            onChange={(e) => setOtherRequirements(e.target.value)}
            disabled={isSaving}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            Enter additional requirements like internet connection, subscriptions, etc. One requirement per line.
          </p>
        </div>
      </CardContent>
    </Card>
  )
} 