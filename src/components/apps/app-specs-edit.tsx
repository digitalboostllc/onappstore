"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { Save, X } from "lucide-react"
import type { AppWithDetails } from "@/lib/services/app-service"
import { CategorySelect } from "@/components/apps/category-select"
import { CategoryWithStats } from "@/lib/categories"

interface AppSpecsEditProps {
  app: AppWithDetails
  categories: CategoryWithStats[]
  onCancel: () => void
  onSave?: (updatedApp: AppWithDetails) => void
}

export function AppSpecsEdit({ app, categories, onCancel, onSave }: AppSpecsEditProps) {
  const [isSaving, setIsSaving] = useState(false)
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

      toast({
        title: "Success",
        description: "App specifications updated successfully",
      })
      
      if (onSave) {
        onSave(updatedApp)
      }
      
      onCancel()
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>App Specifications</CardTitle>
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
          <Label>Vendor</Label>
          <Input
            placeholder="Enter vendor name..."
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            disabled={isSaving}
          />
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Category</Label>
            <CategorySelect
              categoryId={categoryId}
              subcategoryId={subcategoryId}
              onCategoryChange={setCategoryId}
              onSubcategoryChange={setSubcategoryId}
              categories={categories}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Subcategory</Label>
            <CategorySelect
              categoryId={categoryId}
              subcategoryId={subcategoryId}
              onCategoryChange={setCategoryId}
              onSubcategoryChange={setSubcategoryId}
              categories={categories}
              isSubcategorySelect
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>Price</Label>
          <Input
            placeholder="Enter price..."
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            disabled={isSaving}
          />
        </div>
        
        <div className="space-y-2">
          <Label>License</Label>
          <Input
            placeholder="Enter license type..."
            value={license}
            onChange={(e) => setLicense(e.target.value)}
            disabled={isSaving}
          />
        </div>
        
        <div className="space-y-2">
          <Label>File Size (in bytes)</Label>
          <Input
            type="number"
            placeholder="Enter file size in bytes..."
            value={fileSize}
            onChange={(e) => setFileSize(e.target.value)}
            disabled={isSaving}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Bundle IDs</Label>
          <Textarea
            placeholder="Enter bundle IDs (one per line)..."
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
          <Label>App is actively supported</Label>
        </div>
        
        <div className="space-y-2">
          <Label>System Requirements</Label>
          <Textarea
            placeholder="Enter system requirements..."
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            disabled={isSaving}
            rows={4}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Other Requirements</Label>
          <Textarea
            placeholder="Enter other requirements..."
            value={otherRequirements}
            onChange={(e) => setOtherRequirements(e.target.value)}
            disabled={isSaving}
            rows={4}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Release Date</Label>
          <Input
            type="date"
            value={releaseDate}
            onChange={(e) => setReleaseDate(e.target.value)}
            disabled={isSaving}
          />
        </div>
      </CardContent>
    </Card>
  )
} 