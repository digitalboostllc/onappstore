import { prisma } from "@/lib/prisma"
import { cache } from "react"
import type { MetaTag } from "@/components/admin/seo/types"

// Cache duration (5 minutes)
const CACHE_TIME = 5 * 60 * 1000

// Cache for meta tags
const metaTagsCache = new Map<string, {
  data: MetaTag | null
  timestamp: number
}>()

// Cache for default meta tags
let defaultMetaTagsCache: {
  data: MetaTag | null
  timestamp: number
} = {
  data: null,
  timestamp: 0
}

// Cache for sitemap config
let sitemapConfigCache: {
  data: any[] | null
  timestamp: number
} = {
  data: null,
  timestamp: 0
}

// Cache for social meta
let socialMetaCache: {
  data: any | null
  timestamp: number
} = {
  data: null,
  timestamp: 0
}

// Helper to check if cache is valid
function isCacheValid(timestamp: number) {
  return Date.now() - timestamp < CACHE_TIME
}

export const metaService = {
  getMetaTags: cache(async (page: string): Promise<MetaTag | null> => {
    // Check cache first
    const cached = metaTagsCache.get(page)
    if (cached && isCacheValid(cached.timestamp)) {
      return cached.data
    }

    try {
      const metaTags = await prisma.seoMetaTag.findUnique({
        where: { page }
      })

      const result = metaTags ? {
        title: metaTags.title,
        description: metaTags.description,
        keywords: metaTags.keywords || "",
        canonical: metaTags.canonical || undefined
      } : null

      // Update cache
      metaTagsCache.set(page, {
        data: result,
        timestamp: Date.now()
      })

      return result
    } catch (error) {
      console.error("[GET_META_TAGS]", error)
      return null
    }
  }),

  getDefaultMetaTags: cache(async () => {
    // Check cache first
    if (defaultMetaTagsCache.data && isCacheValid(defaultMetaTagsCache.timestamp)) {
      return defaultMetaTagsCache.data
    }

    try {
      const defaultMetaTags = await prisma.seoMetaTag.findUnique({
        where: { page: "default" }
      })

      const result = defaultMetaTags ? {
        title: defaultMetaTags.title,
        description: defaultMetaTags.description,
        keywords: defaultMetaTags.keywords || "",
        canonical: defaultMetaTags.canonical || undefined
      } : {
        title: "MacApps Hub",
        description: "Download the best Mac apps - A curated collection of macOS applications",
        keywords: "mac apps, macos applications, mac software, apple apps",
        canonical: "https://macappshub.com"
      }

      // Update cache
      defaultMetaTagsCache = {
        data: result,
        timestamp: Date.now()
      }

      return result
    } catch (error) {
      console.error("[GET_DEFAULT_META_TAGS]", error)
      return {
        title: "MacApps Hub",
        description: "Download the best Mac apps - A curated collection of macOS applications",
        keywords: "mac apps, macos applications, mac software, apple apps",
        canonical: "https://macappshub.com"
      }
    }
  }),

  getSitemapConfig: cache(async () => {
    // Check cache first
    if (sitemapConfigCache.data && isCacheValid(sitemapConfigCache.timestamp)) {
      return sitemapConfigCache.data
    }

    try {
      const config = await prisma.sitemapConfig.findMany({
        where: { enabled: true },
        orderBy: { path: 'asc' }
      })

      // Update cache
      sitemapConfigCache = {
        data: config,
        timestamp: Date.now()
      }

      return config
    } catch (error) {
      console.error("[GET_SITEMAP_CONFIG]", error)
      return []
    }
  }),

  getSocialMeta: cache(async () => {
    // Check cache first
    if (socialMetaCache.data && isCacheValid(socialMetaCache.timestamp)) {
      return socialMetaCache.data
    }

    try {
      const meta = await prisma.socialMeta.findFirst()

      // Update cache
      socialMetaCache = {
        data: meta,
        timestamp: Date.now()
      }

      return meta
    } catch (error) {
      console.error("[GET_SOCIAL_META]", error)
      return null
    }
  }),

  // Cache invalidation methods
  invalidateMetaTags(page: string) {
    metaTagsCache.delete(page)
  },

  invalidateDefaultMetaTags() {
    defaultMetaTagsCache.data = null
  },

  invalidateSitemapConfig() {
    sitemapConfigCache.data = null
  },

  invalidateSocialMeta() {
    socialMetaCache.data = null
  }
} 