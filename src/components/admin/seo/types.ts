export interface MetaTag {
  title: string
  description: string
  keywords: string
  canonical?: string
}

export interface PageMetaTags {
  [key: string]: MetaTag
}

export interface SitemapEntry {
  id: string
  path: string
  changefreq: string
  priority: number
  enabled: boolean
}

export interface SitemapSettings {
  lastmod: boolean
  changefreq: boolean
  priority: boolean
  defaultChangefreq: string
  defaultPriority: number
  sitemapExcludeNoindex: boolean
  sitemapExcludePatterns: string[]
  sitemapAdditionalUrls: string[]
}

export interface RobotsRule {
  id: string
  userAgent: string
  allow: string[]
  disallow: string[]
  enabled: boolean
}

export interface RobotsSettings {
  useCustomContent: boolean
  customContent: string
  rules: RobotsRule[]
}

export interface SocialMeta {
  og: {
    title: string
    description: string
    siteName: string
    type: string
    image: string
    url: string
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

export interface MetaTemplate {
  title: string
  description: string
  keywords: string
  canonical: string
}

export interface DefaultMetaTags {
  title: string
  titleTemplate: string
  description: string
  keywords: string
  author: string
  viewport: string
  charset: string
  language: string
  themeColor: string
} 