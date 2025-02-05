"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/hooks/use-toast"
import { useCurrentUser } from "@/hooks/use-current-user"
import { Pencil, Save, X, BadgeCheck } from "lucide-react"
import type { AppWithDetails } from "@/lib/services/app-service"

interface AppDeveloperProps {
  app: AppWithDetails
  onUpdate?: (updatedApp: AppWithDetails) => void
}

export function AppDeveloper({ app: initialApp, onUpdate }: AppDeveloperProps) {
  const user = useCurrentUser()
  const [app, setApp] = useState(initialApp)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [companyName, setCompanyName] = useState(app.developer?.companyName || "")
  const [verified, setVerified] = useState(app.developer?.verified || false)

  // Update local state when initialApp changes
  useEffect(() => {
    setApp(initialApp)
    setCompanyName(initialApp.developer?.companyName || "")
    setVerified(initialApp.developer?.verified || false)
  }, [initialApp])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/admin/apps/${app.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          developer: {
            companyName: companyName.trim(),
            verified,
          },
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || 'Failed to update developer info')
      }

      const updatedApp = await response.json()
      
      if (!updatedApp?.developer) {
        throw new Error('Invalid response: Missing developer data')
      }
      
      // Update all relevant state with the new data
      setApp(updatedApp)
      setCompanyName(updatedApp.developer?.companyName || "")
      setVerified(updatedApp.developer?.verified || false)
      
      if (onUpdate) {
        onUpdate(updatedApp)
      }

      toast({
        title: "Success",
        description: "Developer info updated successfully",
      })

      setIsEditing(false)
    } catch (error) {
      console.error("Error updating developer info:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update developer info. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setCompanyName(app.developer?.companyName || "")
    setVerified(app.developer?.verified || false)
    setIsEditing(false)
  }

  return (
    <Card className="bg-background shadow-sm">
      <CardHeader className="p-3 pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Developer</CardTitle>
          {user?.isAdmin && (
            isEditing ? (
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  <X className="h-3 w-3" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  <Save className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-2">
        {isEditing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="h-8 text-sm"
                placeholder="Optional"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="verified"
                checked={verified}
                onCheckedChange={(checked) => setVerified(checked)}
              />
              <Label htmlFor="verified">Verified Developer</Label>
            </div>
          </div>
        ) : (
          <div className="text-xs">
            <div className="flex items-center gap-1">
              <span className="font-medium">{app.developer?.user?.name}</span>
              {app.developer?.verified && (
                <BadgeCheck className="h-4 w-4 text-blue-500" />
              )}
            </div>
            {app.developer?.companyName && (
              <div className="text-muted-foreground mt-1">
                {app.developer.companyName}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 