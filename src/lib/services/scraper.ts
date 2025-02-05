import * as cheerio from "cheerio"
import { downloadImage } from "@/lib/utils/download"
import { PrismaClient } from "@prisma/client"
import { Prisma } from "@prisma/client"

const prisma = new PrismaClient()

// Basic info from listing page
export interface AppBasicInfo {
  name: string
  version: string | null
  iconUrl: string | null
  detailUrl: string
  appId: string | null
}

// Full app data after detail scraping
export interface AppData {
  name: string
  description: string
  category: {
    name: string
    parentName?: string | null
    macUpdateId?: string | null
    subcategoryMacUpdateId?: string | null
  }
  website: string
  icon: string | null
  screenshots: string[]
  version: string | null
  requirements: string | null
  fullContent: string
  release_notes?: string | null
  vendorData?: {
    id: number
    title: string
    description: string
    slug?: string
    logo?: { url: string }
  } | null
  license?: string | null
  fileSize?: string | null
  bundleIds?: string[] | null
  price?: string | null
  downloadCount?: number | null
  isBeta?: boolean
  vendor?: string | null
  monetization?: Array<{ type: string, title: string }>
  isSupported?: boolean
  downloadUrl?: string | null
  purchaseUrl?: string | null
  releaseDate?: Date | null
  lastScanDate?: Date | null
  shortDescription?: string
  otherRequirements?: string | null
  originalCategory?: string | null
}

// Helper function to clean HTML content
function cleanHtml(html: string | null | undefined, preserveHtml: boolean = false): string {
  if (!html) return ""
  
  try {
    if (preserveHtml) {
      // Just clean up whitespace but preserve HTML tags
      return html
        .replace(/\s+/g, ' ')
        .replace(/>\s+</g, '><')
        .trim()
    }
    
    const $ = cheerio.load(html)
    return $('body').text()
      .replace(/\s+/g, ' ')
      .trim()
  } catch (error) {
    console.error("Error cleaning HTML:", error)
    return preserveHtml ? html : html.replace(/<[^>]+>/g, '').trim()
  }
}

// Helper function to map MacUpdate categories
function mapMacUpdateCategory(category: any, $: cheerio.CheerioAPI): { mapped: string, original: any, parent: string | null } {
  // If it's already an object with name and parent
  if (category && typeof category === 'object' && category.name) {
    const result = {
      mapped: category.name.trim(),
      original: category,
      parent: category.parent?.name?.trim() || null
    }
    console.log("Mapped object category result:", result)
    return result
  }

  // If it's a string, try to parse it
  if (typeof category === 'string') {
    // Clean and normalize the input category
    const cleanCategory = category.trim()
    console.log("Processing string category:", cleanCategory)
    
    // For MacUpdate categories, they use "Parent --> Child" format
    const parts = cleanCategory.split(/\s*-->\s*/).map(p => p.trim())
    console.log("Category parts:", parts)
    
    // If we have a parent --> child format, use it
    if (parts.length > 1) {
      const result = {
        mapped: parts[1], // Use the child category as the main category
        original: {
          name: parts[1],
          parent: {
            name: parts[0]
          }
        },
        parent: parts[0]
      }
      console.log("Mapped parent-->child category result:", result)
      return result
    }

    // For single categories
    const result = {
      mapped: cleanCategory,
      original: {
        name: cleanCategory
      },
      parent: null
    }
    console.log("Mapped single category result:", result)
    return result
  }

  // Default case
  return {
    mapped: "Uncategorized",
    original: category,
    parent: null
  }
}

// Helper function to clean URLs
function cleanUrl(urlInput: string | { url: string, type?: string } | null | undefined): string | undefined {
  try {
    if (!urlInput) return undefined
    
    // If it's an object with a URL property (from download/screenshot data)
    const url = typeof urlInput === 'object' ? urlInput.url : urlInput
    if (!url || typeof url !== 'string') return undefined
    
    // If it's already a full URL, just encode it
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return encodeURI(url.trim())
    }
    
    // For relative URLs, add the base URL
    const baseUrl = "https://www.macupdate.com"
    const cleanPath = url.trim().startsWith('/') ? url.trim().slice(1) : url.trim()
    return encodeURI(`${baseUrl}/${cleanPath}`)
  } catch (error) {
    console.error("Error cleaning URL:", urlInput, error)
    return undefined
  }
}

// Extract data from Next.js script tag
function extractNextData($: cheerio.CheerioAPI): any {
  try {
    console.log("Looking for Next.js data script tag...")
    const scriptTag = $('script#__NEXT_DATA__')
    console.log("Script tag found:", scriptTag.length > 0)
    
    const scriptContent = scriptTag.html()
    if (!scriptContent) {
      console.log("No script content found")
      return null
    }
    
    console.log("Script content length:", scriptContent.length)
    const nextData = JSON.parse(scriptContent)
    
    // Get app data from the correct path
    const rawAppData = nextData?.props?.pageProps?.appData?.data
    
    if (rawAppData) {
      // Map the data to our expected format
      const appData = {
        ...rawAppData,
        shortDescription: rawAppData.short_description || null,
        bundleIds: rawAppData.bundle_identifiers || [],
      }
      
      console.log("App data found:", {
        title: appData.title,
        hasDescription: !!appData.description,
        hasScreenshots: Array.isArray(appData.screenshots),
        screenshotsCount: Array.isArray(appData.screenshots) ? appData.screenshots.length : 0,
        availableFields: Object.keys(appData),
        category: appData.category,
        categoryType: typeof appData.category,
        categoryStructure: appData.category && typeof appData.category === 'object' ? Object.keys(appData.category) : null,
        shortDescription: appData.shortDescription,
        bundleIds: appData.bundleIds
      })
      return appData
    }
    
    // If no appData.data, log the structure to see what we have
    console.log("PageProps structure:", {
      hasAppData: !!nextData?.props?.pageProps?.appData,
      appDataKeys: Object.keys(nextData?.props?.pageProps?.appData || {}),
      allPagePropsKeys: Object.keys(nextData?.props?.pageProps || {})
    })
    
    // Try to get raw HTML content if Next.js data fails
    console.log("Falling back to HTML scraping...")
    const basicData = {
      title: $('.mu_app_name').text().trim() || $('.mu_card_complex_line_title').text().trim(),
      description: $('.mu_app_description').text().trim(),
      version: $('.mu_app_version').text().trim(),
      category: $('.mu_app_category').text().trim()
    }
    console.log("Basic HTML data:", basicData)
    
    return basicData  // Return the basic data instead of null
  } catch (error) {
    console.error("Error parsing Next.js data:", error)
    // Log the actual script content if there's an error
    const scriptContent = $('script#__NEXT_DATA__').html()
    console.log("Script content sample:", scriptContent?.slice(0, 500))
    return null
  }
}

// Update the category mapping function
async function mapCategory(categoryName: string | null | undefined, parentName: string | null | undefined = null, macUpdateId?: string | null): Promise<{ categoryId: string | null, subcategoryId: string | null }> {
  // Clean the category names
  let cleanCategory = categoryName?.trim() || null
  let cleanParent = parentName?.trim() || null
  
  console.log(`[Category] Mapping: ${cleanCategory}${cleanParent ? ` (parent: ${cleanParent})` : ''}`)
  console.log(`[Category] MacUpdate ID: ${macUpdateId}`)
  
  try {
    // First try to find by macUpdateId
    if (macUpdateId) {
      const category = await prisma.category.findFirst({
        where: { macUpdateId: macUpdateId.toString() },
        include: { parent: true }
      })

      if (category) {
        // If this is a subcategory (has a parent), use parent as categoryId and this as subcategoryId
        if (category.parent) {
          console.log(`[Category] Found subcategory by macUpdateId: ${category.name} (${category.id}) under ${category.parent.name} (${category.parent.id})`)
          return {
            categoryId: category.parent.id,
            subcategoryId: category.id
          }
        }
        // If this is a main category, use it as categoryId
        console.log(`[Category] Found main category by macUpdateId: ${category.name} (${category.id})`)
        return {
          categoryId: category.id,
          subcategoryId: null
        }
      }
    }

    // If we have both category and parent names, try to find them
    if (cleanCategory && cleanParent) {
      // First find or create the parent category
      const parentCategory = await prisma.category.findFirst({
        where: { 
          name: cleanParent,
          parentId: null // Parent categories have no parent
        }
      })

      if (!parentCategory) {
        // Create parent category if it doesn't exist
        const newParentCategory = await prisma.category.create({
          data: {
            name: cleanParent
          }
        })
        console.log(`[Category] Created parent category: ${cleanParent} (${newParentCategory.id})`)

        // Create subcategory under new parent
        const newSubcategory = await prisma.category.create({
          data: {
            name: cleanCategory,
            parentId: newParentCategory.id
          }
        })
        console.log(`[Category] Created subcategory: ${cleanCategory} (${newSubcategory.id}) under ${cleanParent} (${newParentCategory.id})`)

        return {
          categoryId: newParentCategory.id,
          subcategoryId: newSubcategory.id
        }
      } else {
        // Find existing subcategory or create new one
        const subcategory = await prisma.category.findFirst({
          where: {
            name: cleanCategory,
            parentId: parentCategory.id
          }
        })

        if (!subcategory) {
          // Create new subcategory under existing parent
          const newSubcategory = await prisma.category.create({
            data: {
              name: cleanCategory,
              parentId: parentCategory.id
            }
          })
          console.log(`[Category] Created subcategory: ${cleanCategory} (${newSubcategory.id}) under existing ${cleanParent} (${parentCategory.id})`)

          return {
            categoryId: parentCategory.id,
            subcategoryId: newSubcategory.id
          }
        }

        console.log(`[Category] Found existing subcategory: ${cleanCategory} (${subcategory.id}) under ${cleanParent} (${parentCategory.id})`)
        return {
          categoryId: parentCategory.id,
          subcategoryId: subcategory.id
        }
      }
    }

    // If we only have a category name, try to find it as a standalone category
    if (cleanCategory) {
      const category = await prisma.category.findFirst({
        where: {
          name: cleanCategory,
          parentId: null
        }
      })

      if (!category) {
        // Create new standalone category
        const newCategory = await prisma.category.create({
          data: {
            name: cleanCategory
          }
        })
        console.log(`[Category] Created standalone category: ${cleanCategory} (${newCategory.id})`)
        return {
          categoryId: newCategory.id,
          subcategoryId: null
        }
      }

      console.log(`[Category] Found existing standalone category: ${cleanCategory} (${category.id})`)
      return {
        categoryId: category.id,
        subcategoryId: null
      }
    }

    console.log(`[Category] No matching categories found for ${cleanCategory}${cleanParent ? ` with parent ${cleanParent}` : ''}`)
    return { categoryId: null, subcategoryId: null }
  } catch (error) {
    console.error(`Error finding category ${categoryName}:`, error)
    return { categoryId: null, subcategoryId: null }
  }
}

// Helper function to build URLs
function buildUrl(baseUrl: string, path: string): string {
  try {
    // If path is already a full URL, return it
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path
    }
    
    // Remove leading slash from path if present
    const cleanPath = path.startsWith('/') ? path.slice(1) : path
    
    // Join base URL and path
    return `${baseUrl}/${cleanPath}`
  } catch (error) {
    console.error("Error building URL:", error)
    return path
  }
}

export async function scrapeAppListing(page: number = 1, limit?: number): Promise<AppBasicInfo[]> {
  const baseUrl = "https://www.macupdate.com"
  const apps: AppBasicInfo[] = []
  
  try {
    console.log(`Fetching MacUpdate listing page ${page}${limit ? ` with limit: ${limit}` : ' with no limit'}...`)
    
    // Build the properly encoded URL - fix the URL construction to handle pagination correctly
    const listingUrl = `${baseUrl}/find/mac/sort=date;rating=;price=all;updated=all;categories=;page=${page}`
    
    console.log("Fetching URL:", listingUrl)
    
    const response = await fetch(
      listingUrl,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      }
    )
    
    if (!response.ok) {
      throw new Error(`Failed to fetch MacUpdate listing page ${page}: ${response.status}`)
    }
    
    const html = await response.text()
    console.log("Got HTML response, length:", html.length)
    
    const $ = cheerio.load(html)

    // Try to get Next.js data first for the entire listing
    const scriptTag = $('script#__NEXT_DATA__')
    let listingData = null
    if (scriptTag.length > 0) {
      try {
        const scriptContent = scriptTag.html()
        if (scriptContent) {
          const nextData = JSON.parse(scriptContent)
          // Try different paths where apps data might be stored
          listingData = nextData?.props?.pageProps?.apps || 
                       nextData?.props?.pageProps?.data?.apps ||
                       nextData?.props?.pageProps?.initialData?.apps
          console.log("Found listing data in Next.js:", {
            hasListingData: !!listingData,
            appCount: listingData?.length || 0,
            dataStructure: nextData?.props?.pageProps ? Object.keys(nextData.props.pageProps) : [],
            sample: listingData?.[0] ? {
              id: listingData[0].id,
              title: listingData[0].title,
              fields: Object.keys(listingData[0])
            } : null
          })
        }
      } catch (error) {
        console.error("Error parsing listing Next.js data:", error)
      }
    }

    // If we have Next.js data, use it directly
    if (listingData && Array.isArray(listingData)) {
      console.log("Using Next.js data for app listing")
      // Only slice if limit is defined
      const appsToProcess = limit ? listingData.slice(0, limit) : listingData
      const nextJsApps = appsToProcess.map(app => {
        const appId = app.id?.toString() || app.slug
        const detailUrl = app.url || `/app/mac/${appId}`
        const fullDetailUrl = detailUrl.startsWith('http') ? detailUrl : `${baseUrl}${detailUrl}`
        
        return {
          name: app.title || app.name,
          version: app.version,
          iconUrl: app.icon_url || app.icon,
          detailUrl: fullDetailUrl,
          appId
        }
      }).filter(app => app.name && app.appId)

      apps.push(...nextJsApps)
      console.log(`Extracted ${apps.length} apps from Next.js data`)
      return apps
    }

    // Fallback to HTML scraping if no Next.js data
    console.log("Falling back to HTML scraping")
    // Try different selectors for app elements
    const appElements = [
      ...($('.mu_card_complex_line').toArray() || []),
      ...($('.app-card').toArray() || []),
      ...($('[data-testid="app-card"]').toArray() || []),
      ...($('.app-listing-item').toArray() || [])
    ]
    // Only slice if limit is defined
    const elementsToProcess = limit ? appElements.slice(0, limit) : appElements

    console.log(`Found ${appElements.length} app elements on page ${page}`)
    
    for (const element of elementsToProcess) {
      try {
        const el = $(element)
        
        // Try different selectors for app link
        const linkSelectors = [
          'a.link_app',
          'a[href*="/app/"]',
          '.app-title a',
          '.app-name a',
          'h3 a'
        ]
        
        let detailUrl = null
        let name = null
        let appId = null
        
        // First try to get the URL and app ID
        for (const selector of linkSelectors) {
          const link = el.find(selector)
          if (link.length) {
            detailUrl = link.attr('href')
            if (detailUrl) {
              // Try to extract app ID from standard URL format
              const appIdMatch = detailUrl.match(/\/app\/mac\/(\d+)/)
              appId = appIdMatch ? appIdMatch[1] : null

              // If no app ID found and it's a subdomain URL, use the subdomain
              if (!appId && detailUrl.includes('.macupdate.com')) {
                const subdomainMatch = detailUrl.match(/https?:\/\/([^.]+)\.macupdate\.com/)
                if (subdomainMatch) {
                  appId = `subdomain-${subdomainMatch[1]}`
                }
              }

              break
            }
          }
        }

        // If we have an app ID, try to get the name from Next.js data first
        if (appId && listingData) {
          const appData = listingData.find((app: any) => 
            app.id === appId || 
            (app.subdomain && `subdomain-${app.subdomain}` === appId)
          )
          if (appData?.title) {
            name = appData.title.trim()
          }
        }

        // If no name from Next.js data, try HTML selectors
        if (!name) {
          for (const selector of linkSelectors) {
            const link = el.find(selector)
            if (link.length) {
              // Try to find the most specific name element first
              const nameSelectors = [
                '.app-name',
                '.app-title',
                '.title',
                'h3',
                'strong'
              ]
              
              // Try to find a more specific name element within or near the link
              for (const nameSelector of nameSelectors) {
                const nameEl = link.find(nameSelector).first()
                if (nameEl.length) {
                  name = nameEl.text().trim()
                  break
                }
              }
              
              // If no specific name element found, try to get just the first text node
              if (!name) {
                const firstTextNode = link.contents().filter(function() {
                  return this.nodeType === 3 // Text nodes only
                }).first()
                if (firstTextNode.length) {
                  name = firstTextNode.text().trim()
                } else {
                  name = link.text().trim()
                }
              }

              if (name) break
            }
          }
        }

        // Clean the name if we found one
        if (name) {
          name = name
            .split(/[-–—|,]|\s{3,}/)[0] // Split on common separators and take first part
            .replace(/\d+\.\d+(\.\d+)?/, '') // Remove version numbers
            .replace(/\$\d+(\.\d+)?/, '') // Remove prices
            .replace(/\s+/g, ' ') // Normalize spaces
            .replace(/\s*\([^)]*\)/g, '') // Remove anything in parentheses
            .replace(/\s*-.*$/, '') // Remove anything after a dash
            .replace(/\s*:.*$/, '') // Remove anything after a colon
            .trim()
        }

        if (!detailUrl || !name || !appId) {
          console.log("Skipping app - missing required data", {
            hasDetailUrl: !!detailUrl,
            hasName: !!name,
            hasAppId: !!appId,
            html: el.html()?.slice(0, 200)
          })
          continue
        }

        // Build full detail URL
        const fullDetailUrl = detailUrl.startsWith('http') ? detailUrl : `${baseUrl}${detailUrl}`

        // Get version and icon URL
        let version = null
        let iconUrl = null

        if (listingData && appId) {
          const appData = listingData.find((app: any) => 
            app.id === appId || 
            (app.subdomain && `subdomain-${app.subdomain}` === appId)
          )
          if (appData) {
            version = appData.version
            iconUrl = appData.icon_url
          }
        }

        // Fallback to HTML scraping for version and icon if needed
        if (!version) {
          const versionSelectors = [
            '.mu_card_complex_line_version',
            '.app-version',
            '.version'
          ]
          for (const selector of versionSelectors) {
            const versionEl = el.find(selector)
            if (versionEl.length) {
              version = versionEl.text().trim() || null
              if (version) break
            }
          }
        }

        if (!iconUrl) {
          const iconSelectors = [
            '.mu_card_complex_line_img',
            'img.app-icon',
            '.app-logo img',
            'img[alt*="icon"]'
          ]
          for (const selector of iconSelectors) {
            const iconEl = el.find(selector)
            if (iconEl.length) {
              iconUrl = iconEl.attr('src') || null
              if (iconUrl) break
            }
          }
        }

        console.log(`Basic info extracted - Name: ${name}, Version: ${version}, App ID: ${appId}, URL: ${fullDetailUrl}`)
        
        apps.push({
          name,
          version,
          iconUrl,
          detailUrl: fullDetailUrl,
          appId
        })
      } catch (error) {
        console.error("Error processing app element:", error)
      }
    }
    
    console.log(`Successfully extracted basic info for ${apps.length} apps from page ${page}`)
    return apps
    
  } catch (error) {
    console.error(`Error scraping MacUpdate listing page ${page}:`, error)
    return []
  }
}

// Helper function to format price
function formatPrice(priceData: { value: number, currency: string } | number | string | null | undefined): string | null {
  if (!priceData) return "Free"
  
  try {
    if (typeof priceData === 'object' && priceData.value) {
      const value = priceData.value / 100 // Convert cents to dollars
      return `$${value.toFixed(2)}`
    } else if (typeof priceData === 'number') {
      const value = priceData / 100
      return `$${value.toFixed(2)}`
    } else if (typeof priceData === 'string') {
      if (priceData.toLowerCase() === 'free') {
        return "Free"
      }
      // Try to extract numeric value if it's a price string
      const numericValue = parseFloat(priceData.replace(/[^0-9.]/g, ''))
      if (!isNaN(numericValue)) {
        return `$${numericValue.toFixed(2)}`
      }
      return priceData
    }
  } catch (error) {
    console.error("Error formatting price:", error)
  }
  return "Free" // Default to Free if we can't parse the price
}

// Helper function to process requirements
export function processRequirements(requirements: any): { requirements: string | null; otherRequirements: string | null } {
  console.log('Processing requirements input:', JSON.stringify(requirements, null, 2));

  if (!requirements) {
    console.log('Requirements input is null/undefined');
    return { requirements: null, otherRequirements: null };
  }

  // Helper function to clean HTML
  const cleanHtmlContent = (html: string): string => {
    try {
      const $ = cheerio.load(html);
      return $('body').text().trim()
        .replace(/\s+/g, ' ')
        .trim();
    } catch (error) {
      console.error('Error cleaning HTML:', error);
      return html.replace(/<[^>]+>/g, '').trim();
    }
  };

  // Helper function to format storage/memory sizes
  const formatSize = (size: string): string => {
    const normalized = size.toLowerCase().replace(/\s+/g, '');
    const match = normalized.match(/(\d+(?:\.\d+)?)\s*(mb|gb|tb)?/i);
    if (!match) return size;

    const [, num, unit = ''] = match;
    const value = parseFloat(num);
    if (isNaN(value)) return size;

    // Convert to appropriate unit
    if (unit === 'mb' && value >= 1024) {
      return `${(value / 1024).toFixed(1)} GB`;
    }
    if (unit === 'gb' && value >= 1024) {
      return `${(value / 1024).toFixed(1)} TB`;
    }
    return `${value} ${unit.toUpperCase()}`;
  };

  // If requirements is a string, process it
  if (typeof requirements === 'string') {
    console.log('Processing string requirements:', requirements);
    try {
      const parsed = JSON.parse(requirements);
      console.log('Successfully parsed JSON string:', JSON.stringify(parsed, null, 2));
      return processRequirements(parsed);
    } catch {
      const cleaned = cleanHtmlContent(requirements);
      console.log('Cleaned HTML content:', cleaned);
      
      const lines = cleaned.split(/[\n\r]+/).map(line => line.trim()).filter(Boolean);
      console.log('Split into lines:', lines);
      
      if (lines.length > 1) {
        const systemReqs: string[] = [];
        const otherReqs: string[] = [];
        
        lines.forEach(line => {
          // Enhanced system requirement detection with better OS and architecture handling
          if (
            /^(?:macOS|Mac OS X|OS X)(?:\s+\d+|\s+[A-Za-z]+)/i.test(line) || // OS version with number or name
            /(?:macOS|Mac OS X|OS X)\s+(?:\d+|\w+).*(?:Architecture|Intel|Apple Silicon|M1|M2|x86|arm)/i.test(line) || // OS with architecture
            /^(?:System|Memory|RAM|Storage|Hard\s+Drive|Disk\s+Space):/i.test(line) || // System specs with labels
            /^(?:Processor|CPU|Graphics|GPU|Video\s+Card):/i.test(line) || // Hardware components
            /^(?:Architecture|64-bit|32-bit|Intel|Apple\s+Silicon|M1|M2|x86|arm)/i.test(line) || // Architecture
            /\d+\s*(?:GB|MB|GHz|MHz)/i.test(line) || // Sizes and speeds
            /(?:Intel|AMD)\s+(?:Core|Xeon|Ryzen)/i.test(line) || // Specific processors
            /Architecture:.*(?:Intel|Apple Silicon|M1|M2|x86|arm)/i.test(line) // Architecture specifications
          ) {
            // Format storage/memory sizes if present
            const formattedLine = line.replace(/(\d+(?:\.\d+)?\s*(?:MB|GB|TB))/gi, match => formatSize(match));
            systemReqs.push(formattedLine);
          } else {
            otherReqs.push(line);
          }
        });
        
        return {
          requirements: systemReqs.length > 0 ? systemReqs.join('\n') : null,
          otherRequirements: otherReqs.length > 0 ? otherReqs.join('\n') : null
        };
      }
      
      // Enhanced single line detection with better OS and architecture handling
      if (
        /^(?:macOS|Mac OS X|OS X)(?:\s+\d+|\s+[A-Za-z]+)/i.test(cleaned) || // OS version with number or name
        /(?:macOS|Mac OS X|OS X)\s+(?:\d+|\w+).*(?:Architecture|Intel|Apple Silicon|M1|M2|x86|arm)/i.test(cleaned) || // OS with architecture
        /^(?:System|Memory|RAM|Storage|Processor|CPU|Graphics|GPU):/i.test(cleaned) ||
        /^(?:Architecture|64-bit|32-bit|Intel|Apple\s+Silicon)/i.test(cleaned) ||
        /\d+\s*(?:GB|MB|GHz|MHz)/i.test(cleaned) ||
        /Architecture:.*(?:Intel|Apple Silicon|M1|M2|x86|arm)/i.test(cleaned)
      ) {
        const formattedLine = cleaned.replace(/(\d+(?:\.\d+)?\s*(?:MB|GB|TB))/gi, match => formatSize(match));
        return { requirements: formattedLine, otherRequirements: null };
      }
      
      return { requirements: null, otherRequirements: cleaned };
    }
  }

  // If requirements is an object, format it
  try {
    console.log('Processing object requirements');
    const reqObj = requirements;
    const systemReqs = [];
    
    // Handle minimum OS requirement
    if (reqObj.minimum_os) {
      const osVersion = reqObj.minimum_os.replace(/^(?:Mac OS X|macOS)\s+/i, '');
      systemReqs.push(`macOS ${osVersion}`);
      console.log('Added OS requirement:', `macOS ${osVersion}`);
    }
    
    // Handle architectures with better formatting
    if (reqObj.architectures?.length) {
      const archList = reqObj.architectures.map((arch: string) => {
        // Normalize architecture names
        if (arch.toLowerCase().includes('arm')) return 'Apple Silicon';
        if (arch.toLowerCase().includes('x86_64') || arch.toLowerCase().includes('intel 64')) return 'Intel 64-bit';
        return arch;
      });
      const arch = `Architecture: ${archList.join(', ')}`;
      systemReqs.push(arch);
      console.log('Added architecture requirement:', arch);
    }
    
    // Format other requirements with deduplication
    const otherReqs = new Set<string>();
    const systemReqPatterns = [
      /^(?:Memory|RAM):\s+/i,
      /^(?:Storage|Disk Space|Hard Drive):\s+/i,
      /^(?:Processor|CPU):\s+/i,
      /^(?:Graphics|GPU|Video Card):\s+/i
    ];
    
    // Process requirements in order of preference:
    // 1. other_list (usually contains clean, structured data)
    // 2. other_requirements array
    // 3. other field (usually contains HTML)
    
    // Process other_list first (preferred source)
    if (Array.isArray(reqObj.other_list)) {
      console.log('Processing other_list array:', reqObj.other_list);
      reqObj.other_list.forEach((req: unknown) => {
        if (req && typeof req === 'string') {
          const cleaned = cleanHtmlContent(req)
            .replace(/^[•\-]\s*/, '') // Remove bullet points
            .replace(/\.$/, ''); // Remove trailing period
          
          if (cleaned) {
            // Check if it's a system requirement
            const isSystemReq = systemReqPatterns.some(pattern => pattern.test(cleaned));
            if (isSystemReq) {
              // Format storage/memory sizes if present
              const formattedReq = cleaned.replace(/(\d+(?:\.\d+)?\s*(?:MB|GB|TB))/gi, match => formatSize(match));
              systemReqs.push(formattedReq);
              console.log('Added system requirement from other_list:', formattedReq);
            } else {
              otherReqs.add(cleaned);
              console.log('Added other requirement from other_list:', cleaned);
            }
          }
        }
      });
    }
    
    // Then process other_requirements if any new items
    if (Array.isArray(reqObj.other_requirements)) {
      console.log('Processing other_requirements array:', reqObj.other_requirements);
      reqObj.other_requirements.forEach((req: unknown) => {
        if (req && typeof req === 'string') {
          const cleaned = cleanHtmlContent(req)
            .replace(/^[•\-]\s*/, '')
            .replace(/\.$/, '');
          
          if (cleaned) {
            // Check if it's a system requirement
            const isSystemReq = systemReqPatterns.some(pattern => pattern.test(cleaned));
            if (isSystemReq) {
              const formattedReq = cleaned.replace(/(\d+(?:\.\d+)?\s*(?:MB|GB|TB))/gi, match => formatSize(match));
              systemReqs.push(formattedReq);
              console.log('Added system requirement from other_requirements:', formattedReq);
            } else {
              otherReqs.add(cleaned);
              console.log('Added other requirement from other_requirements:', cleaned);
            }
          }
        }
      });
    }
    
    // Finally process other field if needed
    if (reqObj.other && typeof reqObj.other === 'string' && otherReqs.size === 0) {
      console.log('Processing other field as fallback');
      const cleaned = cleanHtmlContent(reqObj.other)
        .replace(/^[•\-]\s*/, '')
        .replace(/\.$/, '');
      
      if (cleaned) {
        // Check if it's a system requirement
        const isSystemReq = systemReqPatterns.some(pattern => pattern.test(cleaned));
        if (isSystemReq) {
          const formattedReq = cleaned.replace(/(\d+(?:\.\d+)?\s*(?:MB|GB|TB))/gi, match => formatSize(match));
          systemReqs.push(formattedReq);
          console.log('Added system requirement from other field:', formattedReq);
        } else {
          otherReqs.add(cleaned);
          console.log('Added other requirement from other field:', cleaned);
        }
      }
    }

    // Handle architecture bits
    if (reqObj.is_64bit === true) {
      if (reqObj.is_32bit === false) {
        systemReqs.push('64-bit only');
      } else {
        systemReqs.push('64-bit compatible');
      }
      console.log('Added architecture bit requirement');
    }

    // Convert to final format
    const formattedSystemReqs = systemReqs.length > 0 ? systemReqs.join('\n') : null;
    const formattedOtherReqs = otherReqs.size > 0 ? Array.from(otherReqs).join('\n') : null;

    console.log('Final processed requirements:', {
      systemRequirements: formattedSystemReqs,
      otherRequirements: formattedOtherReqs,
      systemReqsCount: systemReqs.length,
      otherReqsCount: otherReqs.size
    });

    return {
      requirements: formattedSystemReqs,
      otherRequirements: formattedOtherReqs
    };
  } catch (error) {
    console.error('Error processing requirements:', error, 'Input:', JSON.stringify(requirements, null, 2));
    return { requirements: null, otherRequirements: null };
  }
}

// Helper function to get best screenshot URL
function getBestScreenshotUrl(screenshot: any): string | undefined {
  if (!screenshot) return undefined
  
  try {
    // If screenshot is a string URL, return it directly
    if (typeof screenshot === 'string') {
      return cleanUrl(screenshot)
    }

    // If screenshot is an object, try different formats and sizes
    if (typeof screenshot === 'object') {
      // Try PNG formats in order of preference
      const possibleUrls = [
        screenshot.l_png,  // Large PNG
        screenshot.m_png,  // Medium PNG
        screenshot.s_png,  // Small PNG
      ]

      // Return the first valid URL
      for (const url of possibleUrls) {
        if (url) {
          const cleanedUrl = cleanUrl(url)
          if (cleanedUrl) return cleanedUrl
        }
      }
    }

    console.log("No valid screenshot URL found:", screenshot)
    return undefined
  } catch (error) {
    console.error("Error getting best screenshot URL:", error)
    return undefined
  }
}

// Helper function to process screenshots
async function processScreenshots(screenshots: any[], appId?: string | null): Promise<string[]> {
  const processedScreenshots: string[] = []
  
  try {
    if (!Array.isArray(screenshots)) {
      console.log("No screenshots array provided")
      return processedScreenshots
    }

    console.log(`Processing ${screenshots.length} screenshots for app ${appId || 'unknown'}`)
    
    for (const screenshot of screenshots) {
      try {
        const url = getBestScreenshotUrl(screenshot)
        if (url) {
          const localUrl = await downloadImage(url, "screenshot", appId || undefined)
          if (localUrl) {
            processedScreenshots.push(localUrl)
            console.log(`Successfully processed screenshot: ${localUrl}`)
          }
        }
      } catch (error) {
        console.error("Error processing individual screenshot:", error)
        // Continue with next screenshot
      }
    }
    
    console.log(`Successfully processed ${processedScreenshots.length}/${screenshots.length} screenshots`)
    return processedScreenshots
  } catch (error) {
    console.error("Error processing screenshots:", error)
    return processedScreenshots
  }
}

// Update the extractCategoriesFromJsonLd function
function extractCategoriesFromJsonLd($: cheerio.CheerioAPI): { category: string | null, parent: string | null } {
  try {
    const script = $('script[type="application/ld+json"]').first()
    if (!script.length) {
      console.log('No JSON-LD found')
      return { category: null, parent: null }
    }

    const jsonLd = JSON.parse(script.html() || '{}')
    const categoryItems = jsonLd.applicationCategory || []
    console.log('Found category items:', categoryItems)

    if (!Array.isArray(categoryItems) || categoryItems.length === 0) {
      return { category: null, parent: null }
    }

    // If we have multiple categories, the first one is the parent and the second is the subcategory
    if (categoryItems.length > 1) {
      console.log('Extracted categories:', { category: categoryItems[1], parent: categoryItems[0] })
      return {
        category: categoryItems[1],
        parent: categoryItems[0]
      }
    }

    // If we only have one category, it's a standalone category
    console.log('Single category:', categoryItems[0])
    return {
      category: categoryItems[0],
      parent: null
    }
  } catch (error) {
    console.error('Error extracting categories from JSON-LD:', error)
    return { category: null, parent: null }
  }
}

// Add this helper function to check existing categories
async function getExistingCategory(categoryName: string, parentName: string | null): Promise<{ categoryId: string | null, subcategoryId: string | null }> {
  try {
    // First try to find the parent category if it exists
    let parentCategory = null
    if (parentName) {
      parentCategory = await prisma.category.findFirst({
        where: { 
          name: parentName,
          parentId: null // Parent categories should not have a parent
        }
      })
    }

    // Then find the subcategory, considering the parent relationship
    const subCategory = await prisma.category.findFirst({
      where: {
        name: categoryName,
        ...(parentName ? { parentId: parentCategory?.id } : {})
      }
    })

    if (parentCategory && subCategory) {
      return {
        categoryId: parentCategory.id,
        subcategoryId: subCategory.id
      }
    } else if (subCategory && !parentName) {
      return {
        categoryId: subCategory.id,
        subcategoryId: null
      }
    }

    return { categoryId: null, subcategoryId: null }
  } catch (error) {
    console.error(`Error finding category ${categoryName}:`, error)
    return { categoryId: null, subcategoryId: null }
  }
}

// Update the scrapeAppDetails function to use the new category mapping
export async function scrapeAppDetails(basicInfo: AppBasicInfo): Promise<AppData | null> {
  try {
    const detailUrl = cleanUrl(basicInfo.detailUrl)
    if (!detailUrl) {
      console.error(`[Error] Invalid URL for ${basicInfo.name}`)
      return null
    }
    
    const detailResponse = await fetch(detailUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })
    
    if (!detailResponse.ok) {
      console.error(`[Error] HTTP ${detailResponse.status} for ${basicInfo.name}`)
      return null
    }
    
    const detailHtml = await detailResponse.text()
    const $ = cheerio.load(detailHtml)
    
    // Try to get Next.js data first
    const scriptTag = $('script#__NEXT_DATA__')
    let nextData = null
    if (scriptTag.length > 0) {
      try {
        const scriptContent = scriptTag.html()
        if (scriptContent) {
          const parsedData = JSON.parse(scriptContent)
          nextData = parsedData?.props?.pageProps?.appData?.data ||
                    parsedData?.props?.pageProps?.app ||
                    parsedData?.props?.pageProps?.initialData?.app
        }
      } catch (error) {
        console.error(`[Error] Failed to parse data for ${basicInfo.name}`)
      }
    }

    if (!nextData) {
      console.error(`[Error] No data found for ${basicInfo.name}`)
      return null
    }

    // Process screenshots with additional formats
    const screenshots: string[] = []
    if (Array.isArray(nextData.screenshots)) {
      const processedScreenshots = await processScreenshots(nextData.screenshots, basicInfo.appId)
      screenshots.push(...processedScreenshots)
    }

    // Download icon - try all possible formats
    let localIconUrl = null
    const iconData = nextData.logo || nextData.icon_url || nextData.icon || nextData.app_icon || basicInfo.iconUrl
    if (iconData) {
      try {
        const iconUrl = getBestScreenshotUrl(iconData)
        if (iconUrl) {
          localIconUrl = await downloadImage(iconUrl, "icon", basicInfo.appId || undefined)
        } else {
          console.log("No valid icon URL found")
        }
      } catch (error) {
        console.error("Error downloading icon:", error)
      }
    }

    // Get all possible dates
    const tryParseDate = (dateStr: string | null | undefined): Date | null => {
      if (!dateStr) return null
      try {
        const parsedDate = new Date(dateStr)
        return !isNaN(parsedDate.getTime()) ? parsedDate : null
      } catch {
        return null
      }
    }

    // Try all possible date fields
    const releaseDate = tryParseDate(
      typeof nextData.date === 'object' ? nextData.date.date : nextData.date
    ) || tryParseDate(nextData.release_date) || tryParseDate(nextData.releaseDate)

    const lastScanDate = tryParseDate(nextData.last_scan) || 
                        tryParseDate(nextData.lastScan) ||
                        tryParseDate(nextData.updated) ||
                        tryParseDate(nextData.updatedAt)

    // Process requirements - ensure proper separation of system and other requirements
    let processedReqs = processRequirements(nextData.requirements);
    
    // If no requirements found, try system_requirements
    if (!processedReqs.requirements && !processedReqs.otherRequirements && nextData.system_requirements) {
      console.log('Trying system_requirements as fallback');
      processedReqs = processRequirements(nextData.system_requirements);
    }

    // If we have data in both fields, merge them
    if (nextData.requirements && nextData.system_requirements) {
      console.log('Found both requirements and system_requirements, merging them');
      const sysReqs = processRequirements(nextData.system_requirements);
      
      // Merge requirements
      const allReqs = [processedReqs.requirements, sysReqs.requirements]
        .filter(Boolean)
        .join('\n');
      
      // Merge other requirements
      const allOtherReqs = [processedReqs.otherRequirements, sysReqs.otherRequirements]
        .filter(Boolean)
        .join('\n');
      
      processedReqs = {
        requirements: allReqs || null,
        otherRequirements: allOtherReqs || null
      };
    }

    // Process other_list if available
    if (nextData.requirements?.other_list && Array.isArray(nextData.requirements.other_list)) {
      console.log('Found other_list in requirements:', nextData.requirements.other_list);
      const otherList = nextData.requirements.other_list
        .filter((item: any) => item && typeof item === 'string')
        .map((item: string) => item.trim())
        .filter(Boolean)
        .join('\n');

      if (otherList) {
        processedReqs.otherRequirements = processedReqs.otherRequirements 
          ? `${processedReqs.otherRequirements}\n${otherList}`
          : otherList;
        console.log('Added other_list to otherRequirements:', otherList);
      }
    }
    
    console.log('Final processed requirements result:', {
      requirements: processedReqs.requirements,
      otherRequirements: processedReqs.otherRequirements
    });

    // Clean app name
    const cleanName = (nextData.title || nextData.name || basicInfo.name)
      .replace(/\d+\.\d+(\.\d+)?/, '') // Remove version numbers
      .replace(/\$\d+(\.\d+)?/, '') // Remove prices
      .replace(/\s+/g, ' ') // Normalize spaces
      .replace(/\s*\([^)]*\)/g, '') // Remove anything in parentheses
      .replace(/\s*-.*$/, '') // Remove anything after a dash
      .replace(/\s*:.*$/, '') // Remove anything after a colon
      .trim()

    // Get developer info
    const developer = nextData.developer || {}
    const vendor = developer.name || nextData.vendor || null

    // Process bundle identifiers
    const bundleIds = Array.isArray(nextData.bundle_identifiers) ? 
      nextData.bundle_identifiers : 
      (nextData.bundle_identifiers ? [nextData.bundle_identifiers] : 
       nextData.bundle_id ? [nextData.bundle_id] : null)

    // Extract categories from multiple sources
    const extractedCategories = extractCategoriesFromJsonLd($)
    
    // Map the category and get IDs
    const { categoryId, subcategoryId } = await mapCategory(
      nextData.category?.name || extractedCategories.category || "Uncategorized",
      nextData.subcategory?.name || extractedCategories.parent,
      nextData.category?.id?.toString()
    )

    // Process vendor data
    const vendorData = nextData.vendor ? {
      id: Number(nextData.vendor.id),
      title: String(nextData.vendor.title || ''),
      description: String(nextData.vendor.description || ''),
      slug: nextData.vendor.slug,
      logo: nextData.vendor.logo?.url ? {
        url: String(nextData.vendor.logo.url)
      } : undefined
    } : null

    // Process monetization data
    const monetization = Array.isArray(nextData.monetization) 
      ? nextData.monetization.map((m: any) => ({
          type: m.type,
          title: m.title
        }))
      : null

    // Get existing app if any
    const existingApp = await prisma.app.findFirst({
      where: {
        OR: [
          { id: basicInfo.appId || "" },
          { name: basicInfo.name }
        ]
      },
      select: {
        id: true,
        categoryId: true,
        subcategoryId: true
      }
    })

    // Process price - ensure it's a string or null
    let price = null
    if (nextData.price) {
      if (typeof nextData.price === 'object' && nextData.price.value) {
        // Convert cents to dollars if needed
        const value = Number(nextData.price.value)
        price = value >= 100 ? `${(value / 100).toFixed(2)}` : `${value.toFixed(2)}`
      } else if (typeof nextData.price === 'string') {
        price = nextData.price
      } else if (typeof nextData.price === 'number') {
        price = nextData.price.toFixed(2)
      }
    }

    // Process vendor - ensure it's a string or null
    let vendorString = null
    if (nextData.vendor) {
      if (typeof nextData.vendor === 'object' && nextData.vendor.name) {
        vendorString = nextData.vendor.name
      } else if (typeof nextData.vendor === 'string') {
        vendorString = nextData.vendor
      }
    }
    vendorString = vendorString || developer.name || null

    // Process dates
    const processedDates = {
      releaseDate: null as Date | null,
      lastScanDate: null as Date | null
    }

    // Handle release date
    if (nextData.release_date) {
      try {
        const parsedDate = new Date(nextData.release_date)
        if (!isNaN(parsedDate.getTime())) {
          processedDates.releaseDate = parsedDate
        }
      } catch (error) {
        console.error(`Error parsing release date for ${basicInfo.name}:`, error)
      }
    }

    // Handle last scan date
    if (nextData.last_scan) {
      try {
        const parsedDate = new Date(nextData.last_scan)
        if (!isNaN(parsedDate.getTime())) {
          processedDates.lastScanDate = parsedDate
        }
      } catch (error) {
        console.error(`Error parsing last scan date for ${basicInfo.name}:`, error)
      }
    }

    // Try to get file size from multiple sources with detailed logging
    let fileSize = null
    console.log('Starting file size extraction for:', nextData.name || nextData.title || basicInfo.name)
    console.log('Raw file size data:', {
      file_size: nextData.file_size,
      fileSize: nextData.fileSize,
      size: nextData.size,
      stats_size: nextData.stats?.size
    })

    if (nextData.file_size || nextData.fileSize || nextData.size || nextData.stats?.size) {
      fileSize = String(nextData.file_size || nextData.fileSize || nextData.size || nextData.stats?.size)
      console.log('Found file size from nextData:', fileSize)
    } else {
      console.log('No file size in nextData, trying HTML extraction')
      // Try to extract from HTML with more specific selectors
      const selectors = [
        '.app-size',
        '.file-size',
        '.download-size',
        'div:contains("Size:")',
        'span:contains("Size:")',
        'p:contains("Size:")'
      ]

      for (const selector of selectors) {
        const element = $(selector)
        if (element.length) {
          console.log(`Found element with selector "${selector}":`, element.text())
          const sizeMatch = element.text().match(/Size:\s*([\d.]+\s*[MG]B)/i)
          if (sizeMatch) {
            fileSize = sizeMatch[1].trim()
            console.log('Extracted file size from element:', fileSize)
            break
          }
        }
      }

      // If specific selectors fail, try full body
      if (!fileSize) {
        console.log('Trying full body HTML search')
        const bodyHtml = $('body').html()
        console.log('Body HTML sample (first 500 chars):', bodyHtml?.substring(0, 500))
        const sizeMatch = bodyHtml?.match(/Size:\s*([\d.]+\s*[MG]B)/i)
        if (sizeMatch) {
          fileSize = sizeMatch[1].trim()
          console.log('Extracted file size from body:', fileSize)
        }
      }
    }

    console.log('Final file size result:', fileSize)

    // Extract release notes from Next.js data or HTML
    let releaseNotes = null
    if (nextData.release_notes) {
      releaseNotes = nextData.release_notes
    } else {
      const releaseNotesContainer = $('.release_notes .mu_read_more_container, .release_notes').first()
      if (releaseNotesContainer.length) {
        releaseNotes = releaseNotesContainer.html() || null
      }
    }
    console.log("Found release notes:", releaseNotes ? "yes" : "no")

    // Keep description and full content separate from release notes
    let description = nextData.description || nextData.full_description || ""
    let fullContent = description

    // Process release notes
    if (releaseNotes) {
      description = cleanHtml(description)
      fullContent = cleanHtml(nextData.full_description || nextData.description || "", true)
    }

    const app: AppData = {
      name: nextData.name || nextData.title || basicInfo.name,
      description: cleanHtml(nextData.description || nextData.full_description || ""),
      shortDescription: nextData.short_description || nextData.shortDescription || nextData.summary || "",
      category: {
        name: nextData.category?.name || extractedCategories.category || "Uncategorized",
        parentName: nextData.subcategory?.name || extractedCategories.parent,
        macUpdateId: nextData.category?.id?.toString(),
        subcategoryMacUpdateId: nextData.subcategory?.id?.toString()
      },
      website: cleanUrl(developer.url || nextData.website || nextData.homepage || "") || "",
      icon: localIconUrl,
      screenshots,
      version: nextData.version || basicInfo.version,
      requirements: processedReqs.requirements,
      otherRequirements: processedReqs.otherRequirements,
      fullContent: cleanHtml(nextData.full_description || nextData.description || "", true),
      release_notes: releaseNotes ? cleanHtml(releaseNotes, true) : null,
      vendorData,
      license: nextData.license || nextData.licenseType || null,
      fileSize,
      bundleIds,
      price,
      downloadCount: typeof nextData.download_count === 'number' ? nextData.download_count : 
                    typeof nextData.downloads === 'number' ? nextData.downloads : null,
      isBeta: Boolean(nextData.is_beta),
      vendor: vendorString,
      monetization,
      isSupported: !nextData.unsupported && !nextData.discontinued,
      downloadUrl: typeof nextData.download_url === 'object' 
        ? cleanUrl(nextData.download_url.url)
        : cleanUrl(nextData.download_url || nextData.downloadUrl || nextData.origin_download_url || nextData.directDownload),
      purchaseUrl: cleanUrl(nextData.purchase_url || nextData.purchaseUrl || nextData.storeUrl || developer.support),
      releaseDate: nextData.date?.date ? new Date(nextData.date.date) : null,
      lastScanDate: nextData.last_scan ? new Date(nextData.last_scan) : null,
      originalCategory: extractedCategories.category,
    }

    return app
  } catch (error) {
    console.error(`[Error] ${basicInfo.name}: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}

export async function scrapeMacUpdate(limit?: number, importAll: boolean = false): Promise<AppData[]> {
  try {
    const appsPerPage = 48
    
    if (!importAll && typeof limit !== 'number') {
      throw new Error("Must provide a numeric limit when not importing all")
    }
    
    // If importAll is true, don't set any limit
    const effectiveLimit = importAll ? Number.MAX_SAFE_INTEGER : limit!
    const totalPages = importAll ? Number.MAX_SAFE_INTEGER : Math.ceil(effectiveLimit / appsPerPage)
    const allBasicInfos: AppBasicInfo[] = []

    console.log(`[Import] Starting import of ${importAll ? 'all' : effectiveLimit} apps`)
    
    for (let page = 1; page <= totalPages; page++) {
      // When importing all, don't pass a limit to scrapeAppListing
      const pageBasicInfos = await scrapeAppListing(page, importAll ? undefined : effectiveLimit)
      if (pageBasicInfos.length > 0) {
        allBasicInfos.push(...pageBasicInfos)
        console.log(`[Progress] Page ${page}: ${allBasicInfos.length}/${effectiveLimit} apps`)
      }

      // Stop only if we get an empty page or reach the limit for non-importAll
      if (pageBasicInfos.length === 0 || (!importAll && allBasicInfos.length >= effectiveLimit)) {
        break
      }

      // Add a small delay between pages
      if (page < totalPages) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    if (allBasicInfos.length === 0) {
      throw new Error("No apps found")
    }

    // Slice basic infos to match limit if not importing all
    const basicInfosToProcess = importAll ? allBasicInfos : allBasicInfos.slice(0, effectiveLimit)
    
    console.log(`[Details] Processing ${basicInfosToProcess.length} apps`)
    const apps = await Promise.all(
      basicInfosToProcess.map(info => scrapeAppDetails(info))
    )
    
    const validApps = apps.filter((app): app is AppData => app !== null)
    console.log(`[Summary] Successfully imported ${validApps.length}/${basicInfosToProcess.length} apps`)
    return validApps
    
  } catch (error) {
    console.error("[Error] Import failed:", error instanceof Error ? error.message : String(error))
    return []
  }
} 