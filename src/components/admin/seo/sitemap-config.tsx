"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/hooks/use-toast"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface SitemapEntry {
  path: string
  changefreq: string
  priority: number
  enabled: boolean
}

const defaultEntries: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: 1.0, enabled: true },
  { path: "/apps", changefreq: "daily", priority: 0.9, enabled: true },
  { path: "/categories", changefreq: "weekly", priority: 0.8, enabled: true },
  { path: "/apps/*", changefreq: "weekly", priority: 0.7, enabled: true },
  { path: "/categories/*", changefreq: "weekly", priority: 0.7, enabled: true },
  { path: "/search", changefreq: "weekly", priority: 0.6, enabled: true },
]

export function SitemapConfig() {
  const [entries, setEntries] = useState<SitemapEntry[]>(defaultEntries)
  const [isLoading, setIsLoading] = useState(false)
  const [newPath, setNewPath] = useState("")

  const handleSubmit = async () => {
    setIsLoading(true)

    try {
      const response = await fetch("/api/admin/seo/sitemap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ entries }),
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
      })

      if (!response.ok) {
        throw new Error("Failed to generate sitemap")
      }

      toast({
        title: "Success",
        description: "Sitemap generated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate sitemap",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const addEntry = () => {
    if (!newPath) return

    setEntries(prev => [
      ...prev,
      {
        path: newPath,
        changefreq: "weekly",
        priority: 0.5,
        enabled: true,
      }
    ])
    setNewPath("")
  }

  const toggleEntry = (index: number) => {
    setEntries(prev => prev.map((entry, i) => 
      i === index ? { ...entry, enabled: !entry.enabled } : entry
    ))
  }

  const updatePriority = (index: number, priority: number) => {
    setEntries(prev => prev.map((entry, i) => 
      i === index ? { ...entry, priority } : entry
    ))
  }

  const updateChangefreq = (index: number, changefreq: string) => {
    setEntries(prev => prev.map((entry, i) => 
      i === index ? { ...entry, changefreq } : entry
    ))
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label>Add New URL Pattern</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                placeholder="/example/*"
              />
              <Button onClick={addEntry} type="button">
                Add
              </Button>
            </div>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>URL Pattern</TableHead>
              <TableHead>Change Frequency</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Enabled</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry, index) => (
              <TableRow key={entry.path}>
                <TableCell>{entry.path}</TableCell>
                <TableCell>
                  <Input
                    type="text"
                    value={entry.changefreq}
                    onChange={(e) => updateChangefreq(index, e.target.value)}
                    className="w-32"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={entry.priority}
                    onChange={(e) => updatePriority(index, parseFloat(e.target.value))}
                    className="w-24"
                  />
                </TableCell>
                <TableCell>
                  <Switch
                    checked={entry.enabled}
                    onCheckedChange={() => toggleEntry(index)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex gap-4">
        <Button onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Configuration"}
        </Button>
        <Button 
          variant="outline" 
          onClick={handleGenerateSitemap} 
          disabled={isLoading}
        >
          Generate Sitemap
        </Button>
      </div>
    </div>
  )
} 