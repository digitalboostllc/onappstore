"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { MetaPreview } from "./preview/meta-preview"

interface SocialMeta {
  og: {
    title: string
    description: string
    image: string
    type: string
    siteName: string
  }
  twitter: {
    card: string
    site: string
    creator: string
    title: string
    description: string
    image: string
  }
}

const defaultMeta: SocialMeta = {
  og: {
    title: "MacApps Hub - Best Mac Apps",
    description: "Discover and download the best Mac apps. A curated collection of macOS applications.",
    image: "/og-image.jpg",
    type: "website",
    siteName: "MacApps Hub"
  },
  twitter: {
    card: "summary_large_image",
    site: "@macappshub",
    creator: "@macappshub",
    title: "MacApps Hub - Best Mac Apps",
    description: "Discover and download the best Mac apps. A curated collection of macOS applications.",
    image: "/twitter-card.jpg"
  }
}

interface SocialMetaFormProps {
  // Add any props needed
}

export function SocialMetaForm({}: SocialMetaFormProps) {
  const [meta, setMeta] = useState<SocialMeta>(defaultMeta)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/admin/seo/social-meta", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(meta),
      })

      if (!response.ok) {
        throw new Error("Failed to update social meta tags")
      }

      toast({
        title: "Success",
        description: "Social meta tags updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update social meta tags",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* OpenGraph Section */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <h3 className="text-lg font-medium">OpenGraph Meta Tags</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={meta.og.title}
                onChange={(e) => setMeta(prev => ({
                  ...prev,
                  og: { ...prev.og, title: e.target.value }
                }))}
                placeholder="OpenGraph title"
              />
            </div>

            <div className="space-y-2">
              <Label>Site Name</Label>
              <Input
                value={meta.og.siteName}
                onChange={(e) => setMeta(prev => ({
                  ...prev,
                  og: { ...prev.og, siteName: e.target.value }
                }))}
                placeholder="Site name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={meta.og.description}
              onChange={(e) => setMeta(prev => ({
                ...prev,
                og: { ...prev.og, description: e.target.value }
              }))}
              placeholder="OpenGraph description"
            />
          </div>

          <div className="space-y-2">
            <Label>Image URL</Label>
            <Input
              value={meta.og.image}
              onChange={(e) => setMeta(prev => ({
                ...prev,
                og: { ...prev.og, image: e.target.value }
              }))}
              placeholder="https://example.com/og-image.jpg"
            />
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={meta.og.type}
              onValueChange={(value) => setMeta(prev => ({
                ...prev,
                og: { ...prev.og, type: value }
              }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="article">Article</SelectItem>
                <SelectItem value="product">Product</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Twitter Cards Section */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <h3 className="text-lg font-medium">Twitter Card Meta Tags</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={meta.twitter.title}
                onChange={(e) => setMeta(prev => ({
                  ...prev,
                  twitter: { ...prev.twitter, title: e.target.value }
                }))}
                placeholder="Twitter card title"
              />
            </div>

            <div className="space-y-2">
              <Label>Card Type</Label>
              <Select
                value={meta.twitter.card}
                onValueChange={(value) => setMeta(prev => ({
                  ...prev,
                  twitter: { ...prev.twitter, card: value }
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Summary</SelectItem>
                  <SelectItem value="summary_large_image">Large Image</SelectItem>
                  <SelectItem value="app">App</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={meta.twitter.description}
              onChange={(e) => setMeta(prev => ({
                ...prev,
                twitter: { ...prev.twitter, description: e.target.value }
              }))}
              placeholder="Twitter card description"
            />
          </div>

          <div className="space-y-2">
            <Label>Image URL</Label>
            <Input
              value={meta.twitter.image}
              onChange={(e) => setMeta(prev => ({
                ...prev,
                twitter: { ...prev.twitter, image: e.target.value }
              }))}
              placeholder="https://example.com/twitter-card.jpg"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Site (@username)</Label>
              <Input
                value={meta.twitter.site}
                onChange={(e) => setMeta(prev => ({
                  ...prev,
                  twitter: { ...prev.twitter, site: e.target.value }
                }))}
                placeholder="@sitename"
              />
            </div>

            <div className="space-y-2">
              <Label>Creator (@username)</Label>
              <Input
                value={meta.twitter.creator}
                onChange={(e) => setMeta(prev => ({
                  ...prev,
                  twitter: { ...prev.twitter, creator: e.target.value }
                }))}
                placeholder="@username"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Section */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-medium">Preview</h3>
          <MetaPreview
            title={meta.og.title}
            description={meta.og.description}
            url="https://macappshub.com"
            ogTitle={meta.og.title}
            ogDescription={meta.og.description}
            ogImage={meta.og.image}
            twitterTitle={meta.twitter.title}
            twitterDescription={meta.twitter.description}
            twitterImage={meta.twitter.image}
          />
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