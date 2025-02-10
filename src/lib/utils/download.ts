import { mkdir, writeFile } from "fs/promises"
import path from "path"
import crypto from "crypto"
import sharp from 'sharp'

// Helper to get MIME type from URL or content type
function getMimeType(url: string, contentType: string | null): string {
  // First try content type from response
  if (contentType && contentType.startsWith('image/')) {
    return contentType
  }
  
  // Then try to guess from URL extension
  const ext = path.extname(url).toLowerCase()
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.gif':
      return 'image/gif'
    case '.webp':
      return 'image/webp'
    default:
      return 'image/png' // Default to PNG if we can't determine type
  }
}

export async function downloadImage(url: string | null | undefined, type: "icon" | "screenshot", appId?: string): Promise<string | null> {
  if (!url) return null
  
  try {
    console.log(`[DOWNLOAD] Starting download for ${type} from: ${url}`)
    
    // Prepare headers based on URL type
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'image/webp,image/apng,image/png,image/*,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    }

    // Add special headers for submission URLs
    if (url.includes('/submission/')) {
      headers['Referer'] = 'https://www.macupdate.com/app/mac'
      headers['Origin'] = 'https://www.macupdate.com'
      headers['Sec-Fetch-Site'] = 'same-site'
      headers['Sec-Fetch-Mode'] = 'no-cors'
      headers['Sec-Fetch-Dest'] = 'image'
    }

    // Fetch the image with headers and timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000) // 30 second timeout
    
    console.log(`[DOWNLOAD] Fetching image with headers:`, headers)
    const response = await fetch(url, { 
      headers,
      signal: controller.signal 
    })
    clearTimeout(timeout)
    
    if (!response.ok) {
      console.error(`[DOWNLOAD] Failed to fetch image from ${url}:`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      })
      return null
    }
    
    // Get the image data as buffer
    const imageBuffer = Buffer.from(await response.arrayBuffer())
    console.log(`[DOWNLOAD] Got image buffer, size: ${imageBuffer.length} bytes`)
    
    // Convert to PNG using sharp
    const pngBuffer = await sharp(imageBuffer)
      .png({ quality: 90 })
      .toBuffer()
    console.log(`[DOWNLOAD] Converted to PNG, size: ${pngBuffer.length} bytes`)
    
    // Create a new blob with PNG MIME type
    const imageBlob = new Blob([pngBuffer], { type: 'image/png' })
    
    // Create form data
    const formData = new FormData()
    formData.append("file", imageBlob, `image.png`)
    formData.append("type", type)
    if (appId) formData.append("appId", appId)
    
    // Upload to our API using absolute URL
    const uploadUrl = process.env.NEXTAUTH_URL 
      ? new URL("/api/upload", process.env.NEXTAUTH_URL).toString()
      : new URL("/api/upload", process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000"
        ).toString()
      
    console.log(`[DOWNLOAD] Uploading to: ${uploadUrl}`)
    
    const uploadController = new AbortController()
    const uploadTimeout = setTimeout(() => uploadController.abort(), 30000)
    
    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
      signal: uploadController.signal
    })
    clearTimeout(uploadTimeout)
    
    if (!uploadResponse.ok) {
      const error = await uploadResponse.json()
      console.error(`[DOWNLOAD] Failed to upload image:`, {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        error,
        headers: Object.fromEntries(uploadResponse.headers.entries())
      })
      return null
    }
    
    const { url: localUrl } = await uploadResponse.json()
    console.log(`[DOWNLOAD] Successfully uploaded image, got URL: ${localUrl}`)
    return localUrl
  } catch (error) {
    console.error(`[DOWNLOAD] Error processing image:`, {
      url,
      type,
      appId,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    })
    return null
  }
}

export function buildUrl(baseUrl: string, path: string): string {
  if (path.startsWith('http')) return path
  return path.startsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`
} 