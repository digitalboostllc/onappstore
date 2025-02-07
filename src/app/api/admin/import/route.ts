import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { logActivity } from "@/lib/services/activity-logger"
import * as cheerio from "cheerio"
import { downloadImage, buildUrl } from "@/lib/utils/download"
import { createImportJob, processImportJob } from "@/lib/services/queue"

interface WPPost {
  id: number
  title: { rendered: string }
  content: { rendered: string }
  excerpt: { rendered: string }
  featured_media: number
  categories: number[]
  date: string
  link: string
}

interface AppData {
  name: string
  description: string
  shortDescription?: string | null
  category: {
    name: string
    parentCategory?: string | null
    macUpdateId?: string | null
  }
  website: string
  icon: string | null
  screenshots: string[]
  version: string | null
  requirements: string | null
  fullContent: string
  bundleIdentifiers?: string[] | null
  otherRequirements?: string | null
}

interface AppCategory {
  name: string
  parentCategory?: string | null
  macUpdateId?: string | null
}

interface AppImportData {
  name: string
  description: string
  category: AppCategory
  website: string
  icon: string | null
  screenshots: string[]
  version: string
  requirements: string | null
  otherRequirements: string | null
  fullContent: string
}

// Clean URLs helper
function cleanUrl(url: string | null | undefined): string | null {
  if (!url) return null
  return encodeURI(url.trim())
}

// Helper function to clean HTML and format text
function cleanHtml(html: string): string {
  if (!html) return ""
  
  // Load HTML into cheerio
  const $ = cheerio.load(html)
  
  // Replace <br> and </p> with newlines
  $('br').replaceWith('\n')
  $('p').append('\n')
  
  // Replace list items with bullet points
  $('li').each((_, el) => {
    $(el).prepend('• ')
    $(el).append('\n')
  })
  
  // Get text content and clean up
  let text = $.text()
    .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newlines
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim()
  
  // Unescape HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
  
  return text
}

// Helper function to extract Next.js data
function extractNextData($: cheerio.CheerioAPI): any {
  try {
    const nextDataScript = $('#__NEXT_DATA__').html()
    console.log("Found Next.js data script:", nextDataScript ? "yes" : "no")
    if (nextDataScript) {
      const data = JSON.parse(nextDataScript)
      console.log("Parsed Next.js data structure:", JSON.stringify(data, null, 2))
      // Try both possible data paths
      const appData = data?.props?.pageProps?.appData?.data || data?.props?.pageProps?.app || null
      console.log("Extracted app data:", appData ? "yes" : "no")
      return appData
    }
  } catch (error) {
    console.error("Error parsing Next.js data:", error)
  }
  return null
}

export async function POST(req: Request) {
  try {
    console.log("Starting import process...")
    const user = await getCurrentUser()
    console.log("Current user:", user?.id, user?.isAdmin)
    
    if (!user?.isAdmin) {
      console.log("Unauthorized access attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { limit, importAll } = body
    console.log("Import parameters:", { limit, importAll })

    // Clean up any existing prepared statements before creating job
    try {
      await prisma.$executeRaw`DEALLOCATE ALL`
    } catch (cleanupError) {
      console.warn("Failed to cleanup prepared statements:", cleanupError)
      // Continue with job creation even if cleanup fails
    }

    // Create a new import job with retry logic
    let job
    try {
      job = await createImportJob()
    } catch (jobError) {
      console.error("Failed to create import job:", jobError)
      if (jobError instanceof Error && jobError.message.includes('42P05')) {
        // One more attempt after a brief delay
        await new Promise(resolve => setTimeout(resolve, 100))
        await prisma.$executeRaw`DEALLOCATE ALL`
        job = await createImportJob()
      } else {
        throw jobError
      }
    }
    
    console.log("Created import job:", job.id)

    // Start processing the job in the background
    console.log("Starting background job processing...")
    await processImportJob(job.id, limit, importAll)
    console.log("Background job started")

    return NextResponse.json({ jobId: job.id })
  } catch (error) {
    console.error("[IMPORT_ERROR]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start import" },
      { status: 500 }
    )
  }
}

// Add endpoint to check job status
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get("jobId")

    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId" }, { status: 400 })
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId }
    })

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    return NextResponse.json(job)
  } catch (error) {
    console.error("[JOB_STATUS_ERROR]", error)
    return NextResponse.json(
      { error: "Failed to get job status" },
      { status: 500 }
    )
  }
}

function mapMacUpdateCategory(categoryData: { name: string; parentName?: string; id?: string }): AppData['category'] {
  const { name, parentName, id } = categoryData

  // Map category names to our standardized format
  const mappedName = name.trim()
  const mappedParentName = parentName?.trim() ?? null
  const mappedId = id ?? null

  return {
    name: mappedName,
    parentCategory: mappedParentName,
    macUpdateId: mappedId
  }
}

async function scrapeMacUpdate(limit: number): Promise<AppData[]> {
  const apps: AppData[] = []
  const baseUrl = "https://www.macupdate.com"
  const appsPerPage = 48 // MacUpdate shows 48 apps per page
  const totalPages = Math.ceil(limit / appsPerPage)
  
  try {
    for (let page = 1; page <= totalPages; page++) {
      console.log(`Fetching MacUpdate page ${page}...`)
      const response = await fetch(
        `${baseUrl}/find/mac/sort=date;rating=;price=all;updated=all;categories=;page=${page}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        }
      )
      
      if (!response.ok) {
        console.error("Response not OK:", response.status, response.statusText)
        throw new Error('Failed to fetch MacUpdate page')
      }
      
      const html = await response.text()
      console.log("Got HTML length:", html.length)
      
      const $ = cheerio.load(html)
      
      // Get all app elements
      const remainingLimit = limit - apps.length
      const appElements = $('.mu_card_complex_line').slice(0, remainingLimit).toArray()
      console.log(`Found ${appElements.length} app elements on page ${page}`)
      
      // Process each app sequentially
      for (const element of appElements) {
        const el = $(element)
        console.log("\nProcessing element:", el.prop('tagName'), el.attr('class'))
        
        // Get app URL from the link_app class
        const appUrl = el.find('a.link_app').attr('href')
        console.log("Found app URL:", appUrl)
        if (!appUrl) {
          console.log("No app URL found, skipping...")
          continue
        }
        
        try {
          // Extract app ID from URL
          const appIdMatch = appUrl.match(/\/app\/mac\/(\d+)/)
          const appId = appIdMatch ? appIdMatch[1] : undefined
          console.log("Extracted app ID:", appId)

          // Basic info from list page
          const name = el.find('.mu_card_complex_line_info_name').text().trim()
          const version = el.find('.mu_card_complex_line_info_version').text().trim()
          const iconUrl = el.find('.mu_card_complex_line_img').attr('src')
          const price = el.find('.mu_card_complex_line_info_price').text().trim()
          
          console.log("Basic info:", { name, version, iconUrl, price })
          
          // Download icon with app ID
          const localIconUrl = await downloadImage(iconUrl, "icon", appId)
          
          // Fetch detailed app page using the buildUrl utility
          const fullAppUrl = buildUrl(baseUrl, appUrl)
          console.log("Fetching app details from:", fullAppUrl)
          const detailResponse = await fetch(fullAppUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          })
          
          if (!detailResponse.ok) {
            console.error("Detail page response not OK:", detailResponse.status)
            continue
          }
          
          const detailHtml = await detailResponse.text()
          console.log("Got detail page HTML length:", detailHtml.length)
          
          const $detail = cheerio.load(detailHtml)
          
          // Extract data from Next.js data script
          const nextData = extractNextData($detail)
          
          let description = ""
          let category: AppData['category'] = {
            name: "Utilities" // Default category
          }
          let websiteUrl = ""
          let requirements = ""
          let otherRequirements: string | null = null
          let screenshots: string[] = []
          let fullContent = ""
          
          if (nextData) {
            // Extract data from Next.js data
            description = nextData.description || ""
            category = mapMacUpdateCategory({
              name: nextData.category?.name || "Utilities",
              parentName: nextData.category?.parentCategory,
              id: nextData.category?.macUpdateId
            })
            websiteUrl = nextData.developer?.url || ""
            
            // Extract detailed requirements
            const reqs = nextData.requirements || {}
            const architectures = reqs.architectures || []
            
            // Try to get file size from HTML
            let fileSize = ""
            const rawHtml = $detail.html()
            const sizeMatch = rawHtml.match(/Size:\s*([\d.]+\s*[MG]B)/i)
            if (sizeMatch) {
              fileSize = sizeMatch[1].trim()
            }
            
            // Process system requirements
            const systemReqParts = [
              reqs.minimum_os && `OS: ${reqs.minimum_os}`,
              architectures.length > 0 && `Architecture: ${architectures.join(", ")}`,
              fileSize && `Size: ${fileSize}`,
            ].filter(Boolean)

            // Process other requirements
            const otherReqParts = []
            
            // Add from other_list array
            if (Array.isArray(reqs.other_list)) {
              otherReqParts.push(...reqs.other_list)
            }
            
            // Add from other field if it's a string
            if (typeof reqs.other === 'string') {
              // Clean HTML from other field
              const $ = cheerio.load(reqs.other)
              const cleanedOther = $('body').text().trim()
              if (cleanedOther) {
                otherReqParts.push(cleanedOther)
              }
            }

            // Process requirements
            const requirements = systemReqParts.length > 0 ? systemReqParts.join("\n") : null
            otherRequirements = otherReqParts.length > 0 ? otherReqParts.join("\n") : null

            // Extract screenshots from Next.js data
            if (nextData.screenshots) {
              // Download each screenshot with app ID
              const screenshotPromises = nextData.screenshots
                .map((s: any) => s.m_png || s.source)
                .filter((url: string | null | undefined): url is string => Boolean(url))
                .map((url: string) => downloadImage(url, "screenshot", appId))
              
              screenshots = (await Promise.all(screenshotPromises))
                .filter((url: string | null): url is string => Boolean(url))
            }
            
            // Build full content including release notes
            const releaseNotes = nextData.release_notes || 
              $detail('.release_notes .mu_read_more_container').html() || 
              $detail('.release_notes').html() || 
              ""
            console.log("Found release notes:", releaseNotes ? "yes" : "no")
            const license = nextData.license || $detail('.mu_app_sub_info_details_item:contains("License")').find('.mu_app_sub_info_details_item_content').text().trim()
            const fullContentParts = [
              description,
              releaseNotes && "\n\n## What's new in version " + version,
              releaseNotes,
            ].filter(Boolean)
            
            description = description || ""
            fullContent = fullContentParts.join("\n")
          }
          
          // Fallback to HTML scraping if Next.js data is incomplete
          if (!description) {
            description = $detail('.mu_app_description').text().trim()
          }
          
          if (!websiteUrl) {
            websiteUrl = $detail('a.mu_app_sub_info_details_item_link[href*="://"]').attr('href') || ""
          }
          
          if (!requirements) {
            requirements = $detail('.mu_app_requirements li').map((_, el) => $detail(el).text().trim()).get().join(', ')
          }
          
          const app: AppImportData = {
            name,
            description: cleanHtml(description),
            category,
            website: cleanUrl(websiteUrl) || "",
            icon: localIconUrl,
            screenshots,
            version,
            requirements,
            otherRequirements,
            fullContent: cleanHtml(fullContent || description),
          }
          
          console.log("Adding app to results:", app.name)
          apps.push(app)

          // Break if we've reached the limit
          if (apps.length >= limit) {
            console.log(`Reached limit of ${limit} apps, stopping...`)
            return apps
          }
        } catch (error) {
          console.error(`Error processing app ${appUrl}:`, error)
        }
      }

      // If we didn't find any apps on this page, stop paginating
      if (appElements.length === 0) {
        console.log(`No apps found on page ${page}, stopping pagination...`)
        break
      }

      // Add a small delay between pages to be nice to the server
      if (page < totalPages) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    return apps
  } catch (error) {
    console.error("Error scraping MacUpdate:", error)
    return []
  }
}

async function scrapeTorrentMac(limit: number): Promise<AppData[]> {
  const apps: AppData[] = []
  const baseUrl = "https://www.torrentmac.net/wp-json/wp/v2"
  
  try {
    const response = await fetch(`${baseUrl}/posts?per_page=${limit}&_embed`)
    if (!response.ok) throw new Error('Failed to fetch posts')
    
    const posts = (await response.json()) as WPPost[]
    
    for (const post of posts) {
      const $ = cheerio.load(post.content.rendered)
      
      // Extract name and version
      const fullTitle = post.title.rendered
        .replace(/<\/?[^>]+(>|$)/g, "") // Remove HTML tags
        .replace(/\[.*?\]/g, "") // Remove square brackets content
        .trim()
      
      const versionMatch = fullTitle.match(/\sv[\d.]+/)
      const name = versionMatch ? fullTitle.split(versionMatch[0])[0].trim() : fullTitle
      const version = versionMatch ? versionMatch[0].substring(2) : null // Remove 'v' prefix
      
      // Get all images
      const images = $('img').map((_, el) => $(el).attr('src')).get()
      const icon = images[0] || null
      const screenshots = images.slice(1).map(url => cleanUrl(url)).filter(Boolean) as string[]
      
      // Extract requirements
      let requirements = null
      $('p, li').each((_, el) => {
        const text = $(el).text().toLowerCase()
        if (text.includes('requires') || text.includes('requirement') || text.includes('macos')) {
          requirements = $(el).text().trim()
          return false // Break the loop
        }
      })
      
      apps.push({
        name,
        description: post.excerpt.rendered.replace(/<\/?[^>]+(>|$)/g, "").trim(),
        fullContent: post.content.rendered,
        category: {
          name: "Utilities", // Default category for TorrentMac
          parentCategory: null,
          macUpdateId: null
        },
        website: cleanUrl(post.link) || "",
        icon: cleanUrl(icon),
        screenshots,
        version,
        requirements,
      })
    }
    
    return apps
  } catch (error) {
    console.error("Error scraping TorrentMac:", error)
    return []
  }
}

async function scrapeCustomUrl(url: string, limit: number): Promise<AppData[]> {
  return []
} 