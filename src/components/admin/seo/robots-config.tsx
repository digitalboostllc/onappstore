"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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

interface RobotsRule {
  userAgent: string
  allow: string[]
  disallow: string[]
  enabled: boolean
}

const defaultRules: RobotsRule[] = [
  {
    userAgent: "*",
    allow: ["/", "/apps", "/categories"],
    disallow: ["/admin", "/api", "/private"],
    enabled: true,
  },
  {
    userAgent: "Googlebot",
    allow: ["*"],
    disallow: ["/admin", "/api"],
    enabled: true,
  }
]

export function RobotsConfig() {
  const [rules, setRules] = useState<RobotsRule[]>(defaultRules)
  const [isLoading, setIsLoading] = useState(false)
  const [newUserAgent, setNewUserAgent] = useState("")
  const [customContent, setCustomContent] = useState("")
  const [useCustomContent, setUseCustomContent] = useState(false)

  const handleSubmit = async () => {
    setIsLoading(true)

    try {
      const response = await fetch("/api/admin/seo/robots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          useCustomContent,
          customContent,
          rules: useCustomContent ? [] : rules,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update robots.txt")
      }

      toast({
        title: "Success",
        description: "Robots.txt updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update robots.txt",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const addRule = () => {
    if (!newUserAgent) return

    setRules(prev => [
      ...prev,
      {
        userAgent: newUserAgent,
        allow: [],
        disallow: [],
        enabled: true,
      }
    ])
    setNewUserAgent("")
  }

  const toggleRule = (index: number) => {
    setRules(prev => prev.map((rule, i) => 
      i === index ? { ...rule, enabled: !rule.enabled } : rule
    ))
  }

  const updateAllowPaths = (index: number, paths: string) => {
    setRules(prev => prev.map((rule, i) => 
      i === index ? { ...rule, allow: paths.split(",").map(p => p.trim()) } : rule
    ))
  }

  const updateDisallowPaths = (index: number, paths: string) => {
    setRules(prev => prev.map((rule, i) => 
      i === index ? { ...rule, disallow: paths.split(",").map(p => p.trim()) } : rule
    ))
  }

  if (useCustomContent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Switch
            checked={useCustomContent}
            onCheckedChange={setUseCustomContent}
          />
          <Label>Use Custom Content</Label>
        </div>

        <div className="space-y-2">
          <Label>Custom robots.txt Content</Label>
          <Textarea
            value={customContent}
            onChange={(e) => setCustomContent(e.target.value)}
            placeholder="Enter custom robots.txt content"
            className="font-mono"
            rows={15}
          />
        </div>

        <Button onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? "Saving..." : "Save robots.txt"}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Switch
          checked={useCustomContent}
          onCheckedChange={setUseCustomContent}
        />
        <Label>Use Custom Content</Label>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label>Add New User Agent</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={newUserAgent}
                onChange={(e) => setNewUserAgent(e.target.value)}
                placeholder="Googlebot"
              />
              <Button onClick={addRule} type="button">
                Add
              </Button>
            </div>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Agent</TableHead>
              <TableHead>Allow</TableHead>
              <TableHead>Disallow</TableHead>
              <TableHead>Enabled</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule, index) => (
              <TableRow key={rule.userAgent + index}>
                <TableCell>{rule.userAgent}</TableCell>
                <TableCell>
                  <Input
                    value={rule.allow.join(", ")}
                    onChange={(e) => updateAllowPaths(index, e.target.value)}
                    placeholder="/, /public"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={rule.disallow.join(", ")}
                    onChange={(e) => updateDisallowPaths(index, e.target.value)}
                    placeholder="/admin, /private"
                  />
                </TableCell>
                <TableCell>
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={() => toggleRule(index)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Button onClick={handleSubmit} disabled={isLoading}>
        {isLoading ? "Saving..." : "Save robots.txt"}
      </Button>
    </div>
  )
} 