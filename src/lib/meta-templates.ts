import type { AppWithDetails } from "@/lib/services/app-service"

export type MetaTemplate = {
  title: string
  description: string
  keywords: string
  canonical?: string
}

export const metaTemplates = {
  app: {
    title: "{AppName} - Download for Mac | MacApps Hub",
    description: "Download {AppName} for Mac - {AppShortDescription}. {AppDescription}",
    keywords: "{AppName}, mac app, {AppCategory}, {AppTags}",
    canonical: "https://macappshub.com/apps/{AppId}"
  },
  category: {
    title: "{CategoryName} Apps for Mac | MacApps Hub",
    description: "Best {CategoryName} apps for Mac. Browse our curated collection of {CategoryName} applications for macOS.",
    keywords: "{CategoryName} mac apps, {CategoryName} macos applications, {CategoryName} software",
    canonical: "https://macappshub.com/categories/{CategoryId}"
  },
  developer: {
    title: "{DeveloperName} Apps | MacApps Hub",
    description: "Download Mac apps by {DeveloperName}. Browse all applications developed by {DeveloperName} for macOS.",
    keywords: "{DeveloperName} mac apps, {DeveloperName} macos applications, {DeveloperName} software",
    canonical: "https://macappshub.com/developers/{DeveloperId}"
  },
  home: {
    title: "MacApps Hub | Download Best Mac Apps & Software",
    description: "Discover and download the best Mac apps and software. Our curated collection features top-rated applications for every need, from productivity to creativity.",
    keywords: "mac apps, macos software, best mac applications, app store, downloads, software",
    canonical: "https://macappshub.com"
  }
} as const

export type TemplateVariable = 
  | "AppName" 
  | "AppId" 
  | "AppDescription" 
  | "AppShortDescription"
  | "AppCategory"
  | "AppTags"
  | "CategoryName"
  | "CategoryId"
  | "DeveloperName"
  | "DeveloperId"

export function replaceTemplateVariables(template: string, app?: AppWithDetails | null): string {
  if (!app) {
    return template.replace(/{[^}]+}/g, "") // Remove all template variables if no app is provided
  }

  const replacements: Record<TemplateVariable, string> = {
    AppName: app.name || "App",
    AppId: app.id || "",
    AppDescription: app.description || "",
    AppShortDescription: app.shortDescription || (app.description ? app.description.slice(0, 150) + "..." : ""),
    AppCategory: app.category?.name || "",
    AppTags: app.tags?.join(", ") || "",
    CategoryName: app.category?.name || "",
    CategoryId: app.categoryId || "",
    DeveloperName: app.developer?.companyName || app.developer?.user?.name || "",
    DeveloperId: app.developerId || ""
  }

  return Object.entries(replacements).reduce((text, [key, value]) => {
    return text.replace(new RegExp(`{${key}}`, "g"), value)
  }, template)
}

export function applyMetaTemplate(
  templateName: keyof typeof metaTemplates,
  app?: AppWithDetails | null
): MetaTemplate {
  const template = metaTemplates[templateName]
  
  return {
    title: replaceTemplateVariables(template.title, app),
    description: replaceTemplateVariables(template.description, app),
    keywords: replaceTemplateVariables(template.keywords, app),
    canonical: template.canonical ? replaceTemplateVariables(template.canonical, app) : undefined
  }
} 