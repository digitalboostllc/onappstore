"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Eye, Smartphone, Monitor } from "lucide-react"

interface MetaPreviewProps {
  title: string
  description: string
  url: string
  ogTitle?: string
  ogDescription?: string
  ogImage?: string
  twitterTitle?: string
  twitterDescription?: string
  twitterImage?: string
}

export function MetaPreview({
  title,
  description,
  url,
  ogTitle,
  ogDescription,
  ogImage,
  twitterTitle,
  twitterDescription,
  twitterImage,
}: MetaPreviewProps) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop")

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Preview</h3>
            <div className="flex items-center gap-2">
              <Button
                variant={device === "desktop" ? "default" : "outline"}
                size="sm"
                onClick={() => setDevice("desktop")}
              >
                <Monitor className="h-4 w-4 mr-2" />
                Desktop
              </Button>
              <Button
                variant={device === "mobile" ? "default" : "outline"}
                size="sm"
                onClick={() => setDevice("mobile")}
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Mobile
              </Button>
            </div>
          </div>

          <Tabs defaultValue="google" className="space-y-4">
            <TabsList>
              <TabsTrigger value="google">Google</TabsTrigger>
              <TabsTrigger value="facebook">Facebook</TabsTrigger>
              <TabsTrigger value="twitter">Twitter</TabsTrigger>
            </TabsList>

            <TabsContent value="google">
              <div className={`space-y-2 ${device === "mobile" ? "max-w-sm" : ""}`}>
                <div className="text-sm text-emerald-600">{url}</div>
                <div className="text-xl text-blue-600 hover:underline cursor-pointer">
                  {title}
                </div>
                <div className="text-sm text-gray-600">
                  {description}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="facebook">
              <div className={`border rounded-lg overflow-hidden ${device === "mobile" ? "max-w-sm" : "max-w-2xl"}`}>
                {ogImage && (
                  <div className="relative aspect-[1.91/1] w-full bg-muted">
                    <img
                      src={ogImage}
                      alt="OpenGraph preview"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <div className="text-xs uppercase text-gray-500">macappshub.com</div>
                  <div className="font-bold">
                    {ogTitle || title}
                  </div>
                  <div className="text-sm text-gray-600">
                    {ogDescription || description}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="twitter">
              <div className={`border rounded-lg overflow-hidden ${device === "mobile" ? "max-w-sm" : "max-w-2xl"}`}>
                {twitterImage && (
                  <div className="relative aspect-[2/1] w-full bg-muted">
                    <img
                      src={twitterImage}
                      alt="Twitter Card preview"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <div className="font-bold">
                    {twitterTitle || title}
                  </div>
                  <div className="text-sm text-gray-600">
                    {twitterDescription || description}
                  </div>
                  <div className="text-xs text-gray-500">
                    macappshub.com
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  )
} 