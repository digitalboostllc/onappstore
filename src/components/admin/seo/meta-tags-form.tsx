"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MetaTemplate, metaTemplates, applyMetaTemplate } from "@/lib/meta-templates"
import type { AppWithDetails } from "@/lib/services/app-service"
import { Search, Facebook, Twitter, Copy, Check } from "lucide-react"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface MetaTagsFormProps {
  app?: AppWithDetails | null
  onUpdate?: (metaTags: MetaTemplate) => void
}

function SearchPreview({ title, description, url }: { title: string; description: string; url: string }) {
  return (
    <div className="max-w-2xl space-y-1">
      <div className="text-sm text-emerald-600 truncate">{url}</div>
      <div className="text-xl text-blue-600 hover:underline cursor-pointer line-clamp-1">{title}</div>
      <div className="text-sm text-gray-600 line-clamp-2">{description}</div>
    </div>
  )
}

function FacebookPreview({ title, description, url, image }: { title: string; description: string; url: string; image?: string }) {
  return (
    <div className="max-w-2xl border rounded-lg overflow-hidden bg-white">
      {image && (
        <div className="relative aspect-[1.91/1] w-full bg-muted">
          <img src={image} alt="OpenGraph preview" className="object-cover w-full h-full" />
        </div>
      )}
      <div className="p-4 space-y-2">
        <div className="text-xs uppercase text-gray-500">{new URL(url).hostname}</div>
        <div className="font-bold line-clamp-2">{title}</div>
        <div className="text-sm text-gray-600 line-clamp-3">{description}</div>
      </div>
    </div>
  )
}

function TwitterPreview({ title, description, url, image }: { title: string; description: string; url: string; image?: string }) {
  return (
    <div className="max-w-2xl border rounded-lg overflow-hidden bg-white">
      {image && (
        <div className="relative aspect-[2/1] w-full bg-muted">
          <img src={image} alt="Twitter Card preview" className="object-cover w-full h-full" />
        </div>
      )}
      <div className="p-4 space-y-2">
        <div className="font-bold line-clamp-2">{title}</div>
        <div className="text-sm text-gray-600 line-clamp-2">{description}</div>
        <div className="text-xs text-gray-500">{new URL(url).hostname}</div>
      </div>
    </div>
  )
}

function TemplateVariablesHelp() {
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null)
  
  const variables = [
    { name: "AppName", description: "Name of the app", example: "Visual Studio Code" },
    { name: "AppId", description: "Unique identifier of the app", example: "vscode" },
    { name: "AppDescription", description: "Full app description", example: "Code editing. Redefined." },
    { name: "AppShortDescription", description: "Short description or truncated description", example: "A code editor redefined..." },
    { name: "AppCategory", description: "App's category name", example: "Development" },
    { name: "AppTags", description: "Comma-separated list of app tags", example: "editor, coding, development" },
    { name: "CategoryName", description: "Category name", example: "Development" },
    { name: "CategoryId", description: "Category identifier", example: "dev" },
    { name: "DeveloperName", description: "Developer/Company name", example: "Microsoft" },
    { name: "DeveloperId", description: "Developer identifier", example: "microsoft" }
  ]

  const copyToClipboard = (variable: string) => {
    navigator.clipboard.writeText(`{${variable}}`);
    setCopiedVariable(variable);
    setTimeout(() => setCopiedVariable(null), 2000);
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Template Variables</h3>
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="ghost" size="sm">How to use?</Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-semibold">Using Template Variables</h4>
                <p className="text-sm text-muted-foreground">
                  Insert these variables in your meta tags to automatically populate them with app data.
                  Variables are wrapped in curly braces, like {"{AppName}"}.
                </p>
                <p className="text-sm text-muted-foreground">
                  Example: "Download {"{AppName}"} - Best {"{AppCategory}"} App"
                </p>
              </div>
            </HoverCardContent>
          </HoverCard>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Variable</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Example</TableHead>
              <TableHead className="w-[50px]">Copy</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variables.map((variable) => (
              <TableRow key={variable.name}>
                <TableCell className="font-mono">{`{${variable.name}}`}</TableCell>
                <TableCell>{variable.description}</TableCell>
                <TableCell className="text-muted-foreground">{variable.example}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(variable.name)}
                  >
                    {copiedVariable === variable.name ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export function MetaTagsForm({ app, onUpdate }: MetaTagsFormProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof metaTemplates>("app")
  const [metaTags, setMetaTags] = useState<MetaTemplate>(() => {
    // Get the template-based meta tags
    const templateTags = applyMetaTemplate(selectedTemplate, app)

    // Add example templates based on selected template if no app is provided
    if (!app) {
      switch (selectedTemplate) {
        case 'app':
          return {
            title: "{AppName} - Download for Mac | Best {AppCategory} App",
            description: "Download {AppName} for Mac - {AppShortDescription}. Available on MacApps Hub, your trusted source for {AppCategory} applications.",
            keywords: "{AppName}, {AppCategory}, mac app, {AppTags}, download, macos",
            canonical: "https://macappshub.com/apps/{AppId}"
          }
        case 'category':
          return {
            title: "Best {CategoryName} Apps for Mac | MacApps Hub",
            description: "Discover the best {CategoryName} apps for Mac. Our curated collection features top-rated {CategoryName} applications for macOS.",
            keywords: "{CategoryName} mac apps, {CategoryName} software, macos {CategoryName} applications, best {CategoryName} apps",
            canonical: "https://macappshub.com/categories/{CategoryId}"
          }
        case 'developer':
          return {
            title: "{DeveloperName} Mac Apps & Software | Official Downloads",
            description: "Download official {DeveloperName} apps for Mac. Explore our collection of {DeveloperName} applications, trusted by millions of macOS users.",
            keywords: "{DeveloperName} mac apps, {DeveloperName} software, official {DeveloperName} downloads, macos applications",
            canonical: "https://macappshub.com/developers/{DeveloperId}"
          }
        case 'home':
          return {
            title: "MacApps Hub | Download Best Mac Apps & Software",
            description: "Discover and download the best Mac apps and software. Our curated collection features top-rated applications for every need, from productivity to creativity.",
            keywords: "mac apps, macos software, best mac applications, app store, downloads, software",
            canonical: "https://macappshub.com"
          }
        default:
          return templateTags
      }
    }

    return templateTags
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleTemplateChange = (template: keyof typeof metaTemplates) => {
    setSelectedTemplate(template)
    
    if (!app) {
      // Use the same default templates as initial state when no app is provided
      switch (template) {
        case 'app':
          setMetaTags({
            title: "{AppName} - Download for Mac | Best {AppCategory} App",
            description: "Download {AppName} for Mac - {AppShortDescription}. Available on MacApps Hub, your trusted source for {AppCategory} applications.",
            keywords: "{AppName}, {AppCategory}, mac app, {AppTags}, download, macos",
            canonical: "https://macappshub.com/apps/{AppId}"
          })
          break
        case 'category':
          setMetaTags({
            title: "Best {CategoryName} Apps for Mac | MacApps Hub",
            description: "Discover the best {CategoryName} apps for Mac. Our curated collection features top-rated {CategoryName} applications for macOS.",
            keywords: "{CategoryName} mac apps, {CategoryName} software, macos {CategoryName} applications, best {CategoryName} apps",
            canonical: "https://macappshub.com/categories/{CategoryId}"
          })
          break
        case 'developer':
          setMetaTags({
            title: "{DeveloperName} Mac Apps & Software | Official Downloads",
            description: "Download official {DeveloperName} apps for Mac. Explore our collection of {DeveloperName} applications, trusted by millions of macOS users.",
            keywords: "{DeveloperName} mac apps, {DeveloperName} software, official {DeveloperName} downloads, macos applications",
            canonical: "https://macappshub.com/developers/{DeveloperId}"
          })
          break
        case 'home':
          setMetaTags({
            title: "MacApps Hub | Download Best Mac Apps & Software",
            description: "Discover and download the best Mac apps and software. Our curated collection features top-rated applications for every need, from productivity to creativity.",
            keywords: "mac apps, macos software, best mac applications, app store, downloads, software",
            canonical: "https://macappshub.com"
          })
          break
      }
    } else {
      // Only use applyMetaTemplate when we have an app
      const newMetaTags = applyMetaTemplate(template, app)
      setMetaTags(newMetaTags)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!app) return

    setIsLoading(true)

    try {
      const response = await fetch(`/api/admin/seo/meta-tags`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page: `apps/${app.id}`,
          metaTags
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update meta tags")
      }

      toast({
        title: "Success",
        description: "Meta tags updated successfully",
      })

      if (onUpdate) {
        onUpdate(metaTags)
      }
    } catch (error) {
      console.error("Error updating meta tags:", error)
      toast({
        title: "Error",
        description: "Failed to update meta tags. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const previewUrl = metaTags.canonical || (app ? `https://macappshub.com/apps/${app.id}` : "https://macappshub.com")

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <Label>Template</Label>
            <Tabs defaultValue={selectedTemplate} value={selectedTemplate} className="w-full">
              <TabsList className="w-full justify-start gap-2 p-1">
                <TabsTrigger
                  value="app"
                  onClick={() => handleTemplateChange("app")}
                >
                  App Page
                </TabsTrigger>
                <TabsTrigger
                  value="category"
                  onClick={() => handleTemplateChange("category")}
                >
                  Category Page
                </TabsTrigger>
                <TabsTrigger
                  value="developer"
                  onClick={() => handleTemplateChange("developer")}
                >
                  Developer Page
                </TabsTrigger>
                <TabsTrigger
                  value="home"
                  onClick={() => handleTemplateChange("home")}
                >
                  Home Page
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={metaTags.title}
              onChange={(e) => setMetaTags({ ...metaTags, title: e.target.value })}
              placeholder="Enter page title"
            />
            <p className="text-sm text-muted-foreground">
              {metaTags.title.length} characters (Recommended: 50-60)
            </p>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={metaTags.description}
              onChange={(e) => setMetaTags({ ...metaTags, description: e.target.value })}
              placeholder="Enter meta description"
            />
            <p className="text-sm text-muted-foreground">
              {metaTags.description.length} characters (Recommended: 150-160)
            </p>
          </div>

          <div className="space-y-2">
            <Label>Keywords</Label>
            <Input
              value={metaTags.keywords}
              onChange={(e) => setMetaTags({ ...metaTags, keywords: e.target.value })}
              placeholder="Enter meta keywords"
            />
          </div>

          <div className="space-y-2">
            <Label>Canonical URL</Label>
            <Input
              value={metaTags.canonical}
              onChange={(e) => setMetaTags({ ...metaTags, canonical: e.target.value })}
              placeholder="Enter canonical URL"
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading || !app}>
              {isLoading ? "Saving..." : "Save Meta Tags"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Preview</h3>
          <Tabs defaultValue="search">
            <TabsList className="mb-4">
              <TabsTrigger value="search" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search Result
              </TabsTrigger>
              <TabsTrigger value="facebook" className="flex items-center gap-2">
                <Facebook className="h-4 w-4" />
                Facebook
              </TabsTrigger>
              <TabsTrigger value="twitter" className="flex items-center gap-2">
                <Twitter className="h-4 w-4" />
                Twitter
              </TabsTrigger>
            </TabsList>

            <TabsContent value="search">
              <SearchPreview
                title={metaTags.title}
                description={metaTags.description}
                url={previewUrl}
              />
            </TabsContent>

            <TabsContent value="facebook">
              <FacebookPreview
                title={metaTags.title}
                description={metaTags.description}
                url={previewUrl}
                image={app?.icon || undefined}
              />
            </TabsContent>

            <TabsContent value="twitter">
              <TwitterPreview
                title={metaTags.title}
                description={metaTags.description}
                url={previewUrl}
                image={app?.icon || undefined}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <TemplateVariablesHelp />
    </form>
  )
} 