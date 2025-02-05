import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { writeFile } from "fs/promises"
import path from "path"
import minimatch from "minimatch"
import { SiteSettings } from "@prisma/client"

interface SitemapSettings {
  sitemapExcludePatterns?: string[]
  sitemapAdditionalUrls?: string[]
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get sitemap settings
    const settings = await prisma.siteSettings.findFirst() as unknown as SitemapSettings | null
    
    // Get sitemap configuration
    const sitemapConfig = await prisma.sitemapConfig.findMany({
      where: { enabled: true }
    })

    // Get all published apps
    const apps = await prisma.app.findMany({
      where: { 
        published: true
      },
      select: { id: true, updatedAt: true }
    })

    // Get all categories
    const categories = await prisma.category.findMany({
      select: { id: true, updatedAt: true }
    })

    // Generate sitemap XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

    // Helper function to check if URL should be excluded
    const shouldExclude = (url: string) => {
      const excludePatterns = (settings as any)?.sitemapExcludePatterns || []
      return excludePatterns.some((pattern: string) => minimatch(url, pattern))
    }

    // Add static URLs from config
    for (const config of sitemapConfig) {
      if (!shouldExclude(config.path)) {
        xml += '  <url>\n'
        xml += `    <loc>https://macappshub.com${config.path}</loc>\n`
        xml += `    <changefreq>${config.changefreq}</changefreq>\n`
        xml += `    <priority>${config.priority}</priority>\n`
        xml += '  </url>\n'
      }
    }

    // Add dynamic app URLs
    for (const app of apps) {
      const url = `/apps/${app.id}`
      if (!shouldExclude(url)) {
        xml += '  <url>\n'
        xml += `    <loc>https://macappshub.com${url}</loc>\n`
        xml += `    <lastmod>${app.updatedAt.toISOString()}</lastmod>\n`
        xml += '    <changefreq>weekly</changefreq>\n'
        xml += '    <priority>0.7</priority>\n'
        xml += '  </url>\n'
      }
    }

    // Add category URLs
    for (const category of categories) {
      const url = `/categories/${category.id}`
      if (!shouldExclude(url)) {
        xml += '  <url>\n'
        xml += `    <loc>https://macappshub.com${url}</loc>\n`
        xml += `    <lastmod>${category.updatedAt.toISOString()}</lastmod>\n`
        xml += '    <changefreq>weekly</changefreq>\n'
        xml += '    <priority>0.8</priority>\n'
        xml += '  </url>\n'
      }
    }

    // Add additional URLs from settings
    const additionalUrls = (settings as any)?.sitemapAdditionalUrls || []
    for (const url of additionalUrls) {
      if (!shouldExclude(url)) {
        xml += '  <url>\n'
        xml += `    <loc>${url.startsWith('http') ? url : `https://macappshub.com${url}`}</loc>\n`
        xml += '    <changefreq>weekly</changefreq>\n'
        xml += '    <priority>0.5</priority>\n'
        xml += '  </url>\n'
      }
    }

    xml += '</urlset>'

    // Write sitemap.xml file
    const publicDir = path.join(process.cwd(), "public")
    await writeFile(path.join(publicDir, "sitemap.xml"), xml)

    return NextResponse.json({ message: "Sitemap generated successfully" }, { status: 200 })
  } catch (error) {
    console.error("[GENERATE_SITEMAP]", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to generate sitemap. Please try again." }, 
      { status: 500 }
    )
  }
} 