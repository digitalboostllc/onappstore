import { prisma } from "@/lib/prisma"
import { MetaTag } from "@/components/admin/seo/types"

export async function getMetaTags(page: string): Promise<MetaTag | null> {
  try {
    const metaTags = await prisma.seoMetaTag.findUnique({
      where: { page }
    })

    if (!metaTags) {
      return null
    }

    return {
      title: metaTags.title,
      description: metaTags.description,
      keywords: metaTags.keywords || "",
      canonical: metaTags.canonical || undefined
    }
  } catch (error) {
    console.error("[GET_META_TAGS]", error)
    return null
  }
}

export async function getDefaultMetaTags() {
  try {
    const defaultMetaTags = await prisma.seoMetaTag.findUnique({
      where: { page: "default" }
    })

    if (!defaultMetaTags) {
      return {
        title: "MacApps Hub",
        description: "Download the best Mac apps - A curated collection of macOS applications",
        keywords: "mac apps, macos applications, mac software, apple apps",
        canonical: "https://macappshub.com"
      }
    }

    return {
      title: defaultMetaTags.title,
      description: defaultMetaTags.description,
      keywords: defaultMetaTags.keywords || "",
      canonical: defaultMetaTags.canonical || undefined
    }
  } catch (error) {
    console.error("[GET_DEFAULT_META_TAGS]", error)
    return {
      title: "MacApps Hub",
      description: "Download the best Mac apps - A curated collection of macOS applications",
      keywords: "mac apps, macos applications, mac software, apple apps",
      canonical: "https://macappshub.com"
    }
  }
} 