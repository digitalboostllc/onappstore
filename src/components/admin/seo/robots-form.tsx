"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/hooks/use-toast"
import { Card, CardContent } from "@/components/ui/card"

interface RobotRule {
  id: string
  userAgent: string
  allow: string[]
  disallow: string[]
  enabled: boolean
}

const defaultRules: RobotRule[] = [
  {
    id: "1",
    userAgent: "*",
    allow: ["/", "/apps", "/categories"],
    disallow: ["/admin", "/api", "/private"],
    enabled: true
  }
]

interface RobotsFormProps {
  // Add any props needed
}

export function RobotsForm({}: RobotsFormProps) {
  const [rules, setRules] = useState<RobotRule[]>(defaultRules)
  const [useCustomContent, setUseCustomContent] = useState(false)
  const [customContent, setCustomContent] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [newUserAgent, setNewUserAgent] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
        throw new Error("Failed to update robots.txt configuration")
      }

      toast({
        title: "Success",
        description: "Robots.txt configuration updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update robots.txt configuration",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const addRule = () => {
    if (!newUserAgent) return

    const rule: RobotRule = {
      id: crypto.randomUUID(),
      userAgent: newUserAgent,
      allow: [],
      disallow: [],
      enabled: true
    }

    setRules([...rules, rule])
    setNewUserAgent("")
  }

  const removeRule = (id: string) => {
    setRules(rules.filter(rule => rule.id !== id))
  }

  const updateRule = (id: string, field: keyof RobotRule, value: string | string[] | boolean) => {
    setRules(rules.map(rule => {
      if (rule.id === id) {
        return { ...rule, [field]: value }
      }
      return rule
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Rules Section */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Robot Rules</h3>
            <div className="flex items-center gap-2">
              <Switch
                checked={useCustomContent}
                onCheckedChange={setUseCustomContent}
              />
              <Label>Use Custom Content</Label>
            </div>
          </div>

          {!useCustomContent && (
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
                    <Button type="button" onClick={addRule}>
                      Add
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {rules.map((rule) => (
                  <div key={rule.id} className="space-y-4 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Label>User Agent</Label>
                        <Input
                          value={rule.userAgent}
                          onChange={(e) => updateRule(rule.id, "userAgent", e.target.value)}
                          placeholder="*"
                          className="mt-2"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRule(rule.id)}
                      >
                        Remove
                      </Button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Allow Paths</Label>
                        <Input
                          value={rule.allow.join(", ")}
                          onChange={(e) => updateRule(rule.id, "allow", e.target.value.split(",").map(s => s.trim()))}
                          placeholder="/, /public"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Disallow Paths</Label>
                        <Input
                          value={rule.disallow.join(", ")}
                          onChange={(e) => updateRule(rule.id, "disallow", e.target.value.split(",").map(s => s.trim()))}
                          placeholder="/admin, /private"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(checked) => updateRule(rule.id, "enabled", checked)}
                      />
                      <Label>Enable Rule</Label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {useCustomContent && (
            <div className="space-y-2">
              <Label>Custom robots.txt Content</Label>
              <Textarea
                value={customContent}
                onChange={(e) => setCustomContent(e.target.value)}
                placeholder="Enter custom robots.txt content"
                rows={20}
                className="font-mono"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Section */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-medium">Preview</h3>
          <Card>
            <CardContent className="pt-6">
              <pre className="whitespace-pre-wrap font-mono text-sm">
                {useCustomContent ? customContent : rules.map(rule => `
User-agent: ${rule.userAgent}
${rule.allow.map(path => `Allow: ${path}`).join("\n")}
${rule.disallow.map(path => `Disallow: ${path}`).join("\n")}
`).join("\n")}
              </pre>
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