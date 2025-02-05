"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { FileJson, Settings, Globe, FileText, RefreshCw } from "lucide-react"
import { SitemapEntry, SitemapSettings } from "./types"

const defaultEntries: SitemapEntry[] = [
  {
    id: "home",
    path: "/",
    changefreq: "weekly",
    priority: 1.0,
    enabled: true
  },
  {
    id: "apps",
    path: "/apps",
    changefreq: "daily",
    priority: 0.9,
    enabled: true
  },
  {
    id: "categories",
    path: "/categories",
    changefreq: "weekly",
    priority: 0.8,
    enabled: true
  }
]

const changeFreqOptions = [
  { value: "always", label: "Always" },
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "never", label: "Never" }
]

const defaultSettings: SitemapSettings = {
  lastmod: true,
  changefreq: true,
  priority: true,
  defaultChangefreq: "weekly",
  defaultPriority: 0.5,
  sitemapExcludeNoindex: true,
  sitemapExcludePatterns: [],
  sitemapAdditionalUrls: []
}

interface SitemapFormProps {
  // Add any props needed
}

export function SitemapForm({}: SitemapFormProps) {
  const [entries, setEntries] = useState<SitemapEntry[]>(defaultEntries)
  const [settings, setSettings] = useState<SitemapSettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(false)
  const [newPath, setNewPath] = useState("")
  const [newAdditionalUrl, setNewAdditionalUrl] = useState("")
  const [newExcludePattern, setNewExcludePattern] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/admin/seo/sitemap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entries,
          settings,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update sitemap configuration")
      }

      toast({
        title: "Success",
        description: "Sitemap configuration updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update sitemap configuration",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateSitemap = async () => {
    setIsLoading(true)

    try {
      const response = await fetch("/api/admin/seo/generate-sitemap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ timestamp: new Date().toISOString() })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate sitemap")
      }

      toast({
        title: "Success",
        description: data.message || "Sitemap generated successfully. You can now view it by clicking 'View Full Sitemap'.",
      })
    } catch (error) {
      console.error("Sitemap generation error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate sitemap. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const addEntry = () => {
    if (!newPath) return

    const entry: SitemapEntry = {
      id: crypto.randomUUID(),
      path: newPath.startsWith("/") ? newPath : `/${newPath}`,
      changefreq: "weekly",
      priority: 0.5,
      enabled: true
    }

    setEntries([...entries, entry])
    setNewPath("")
  }

  const removeEntry = (id: string) => {
    setEntries(entries.filter(entry => entry.id !== id))
  }

  const updateEntry = (id: string, field: keyof SitemapEntry, value: string | number | boolean) => {
    setEntries(entries.map(entry => {
      if (entry.id === id) {
        return { ...entry, [field]: value }
      }
      return entry
    }))
  }

  const addAdditionalUrl = () => {
    if (!newAdditionalUrl) return
    setSettings(prev => ({
      ...prev,
      sitemapAdditionalUrls: [...prev.sitemapAdditionalUrls, newAdditionalUrl]
    }))
    setNewAdditionalUrl("")
  }

  const removeAdditionalUrl = (url: string) => {
    setSettings(prev => ({
      ...prev,
      sitemapAdditionalUrls: prev.sitemapAdditionalUrls.filter(u => u !== url)
    }))
  }

  const addExcludePattern = () => {
    if (!newExcludePattern) return
    setSettings(prev => ({
      ...prev,
      sitemapExcludePatterns: [...prev.sitemapExcludePatterns, newExcludePattern]
    }))
    setNewExcludePattern("")
  }

  const removeExcludePattern = (pattern: string) => {
    setSettings(prev => ({
      ...prev,
      sitemapExcludePatterns: prev.sitemapExcludePatterns.filter(p => p !== pattern)
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* URL Entries Section */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">URL Entries</h3>
            <div className="flex items-center gap-2">
              <Button 
                type="button" 
                variant="outline"
                className="bg-primary-50 text-primary-600 hover:bg-primary-100 hover:text-primary-700 border-primary-200"
                onClick={() => window.open("/sitemap.xml", "_blank")}
              >
                <FileText className="w-4 h-4 mr-2" />
                View Full Sitemap
              </Button>
              <Button 
                type="button" 
                variant="outline"
                className="bg-secondary-50 text-secondary-600 hover:bg-secondary-100 hover:text-secondary-700 border-secondary-200"
                onClick={handleGenerateSitemap}
                disabled={isLoading}
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
                {isLoading ? "Generating..." : "Generate Sitemap"}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>Add New URL Path</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newPath}
                    onChange={(e) => setNewPath(e.target.value)}
                    placeholder="/example-path"
                  />
                  <Button type="button" onClick={addEntry}>
                    Add
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="flex-1">
                    <Input
                      value={entry.path}
                      onChange={(e) => updateEntry(entry.id, "path", e.target.value)}
                      placeholder="URL Path"
                    />
                  </div>

                  <div className="w-32">
                    <Select
                      value={entry.changefreq}
                      onValueChange={(value) => updateEntry(entry.id, "changefreq", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {changeFreqOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-32">
                    <Input
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={entry.priority}
                      onChange={(e) => updateEntry(entry.id, "priority", parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={entry.enabled}
                      onCheckedChange={(checked) => updateEntry(entry.id, "enabled", checked)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEntry(entry.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Section */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <h3 className="text-lg font-medium">Settings</h3>
          
          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardContent className="pt-6">
                <h4 className="text-sm font-medium mb-4">XML Attributes</h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={settings.lastmod}
                      onCheckedChange={(checked) => setSettings(prev => ({ ...prev, lastmod: checked }))}
                    />
                    <Label>Include Last Modified Date</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={settings.changefreq}
                      onCheckedChange={(checked) => setSettings(prev => ({ ...prev, changefreq: checked }))}
                    />
                    <Label>Include Change Frequency</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={settings.priority}
                      onCheckedChange={(checked) => setSettings(prev => ({ ...prev, priority: checked }))}
                    />
                    <Label>Include Priority</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h4 className="text-sm font-medium mb-4">Default Values</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Default Change Frequency</Label>
                    <Select
                      value={settings.defaultChangefreq}
                      onValueChange={(value) => setSettings(prev => ({ ...prev, defaultChangefreq: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {changeFreqOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Default Priority</Label>
                    <Input
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={settings.defaultPriority}
                      onChange={(e) => setSettings(prev => ({ ...prev, defaultPriority: parseFloat(e.target.value) }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium">Exclusions</h4>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.sitemapExcludeNoindex}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, sitemapExcludeNoindex: checked }))}
                  />
                  <Label>Exclude Noindex Pages</Label>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newExcludePattern}
                    onChange={(e) => setNewExcludePattern(e.target.value)}
                    placeholder="/private/*, /temp/*"
                  />
                  <Button type="button" onClick={addExcludePattern}>
                    Add Pattern
                  </Button>
                </div>

                <div className="space-y-2">
                  {settings.sitemapExcludePatterns.map((pattern) => (
                    <div key={pattern} className="flex items-center gap-2 p-2 border rounded-md">
                      <span className="flex-1 text-sm font-mono">{pattern}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExcludePattern(pattern)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h4 className="text-sm font-medium mb-4">Additional URLs</h4>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newAdditionalUrl}
                    onChange={(e) => setNewAdditionalUrl(e.target.value)}
                    placeholder="https://example.com/page"
                  />
                  <Button type="button" onClick={addAdditionalUrl}>
                    Add URL
                  </Button>
                </div>

                <div className="space-y-2">
                  {settings.sitemapAdditionalUrls.map((url) => (
                    <div key={url} className="flex items-center gap-2 p-2 border rounded-md">
                      <span className="flex-1 text-sm font-mono">{url}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAdditionalUrl(url)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
    </form>
  )
} 