"use client"

import { useState } from "react"
import { MetaTagsForm } from "./meta-tags-form"
import { SitemapForm } from "./sitemap-form"
import { RobotsForm } from "./robots-form"
import { SocialMetaForm } from "./social-meta-form"
import { cn } from "@/lib/utils"
import { FileText, Settings, Bot, Globe } from "lucide-react"

const navigation = [
  {
    id: "meta-tags",
    label: "Meta Tags",
    icon: FileText,
    content: <MetaTagsForm />,
  },
  {
    id: "sitemap",
    label: "Sitemap",
    icon: Globe,
    content: <SitemapForm />,
  },
  {
    id: "robots",
    label: "Robots.txt",
    icon: Bot,
    content: <RobotsForm />,
  },
  {
    id: "social",
    label: "Social Media",
    icon: Settings,
    content: <SocialMetaForm />,
  }
]

export function SEOTabs() {
  const [activeItem, setActiveItem] = useState("meta-tags")

  const renderContent = () => {
    switch (activeItem) {
      case "meta-tags":
        return <MetaTagsForm />
      case "sitemap":
        return <SitemapForm />
      case "robots":
        return <RobotsForm />
      case "social":
        return <SocialMetaForm />
      default:
        return null
    }
  }

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <div className="w-64 sticky top-[73px] self-start">
        <nav className="rounded-lg border bg-muted/50 backdrop-blur-sm">
          <div className="p-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = activeItem === item.id
              return (
                <div key={item.id}>
                  <button
                    onClick={() => setActiveItem(item.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                </div>
              )
            })}
          </div>
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1">
        {renderContent()}
      </div>
    </div>
  )
} 