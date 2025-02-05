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

    // Fetch the image with headers
    const response = await fetch(url, { headers })
    if (!response.ok) {
      console.error(`Failed to fetch image from ${url}: ${response.status} ${response.statusText}`)
      return null
    }
    
    // Get the image data as buffer
    const imageBuffer = Buffer.from(await response.arrayBuffer())
    
    // Convert to PNG using sharp
    const pngBuffer = await sharp(imageBuffer)
      .png({ quality: 90 })
      .toBuffer()
    
    // Create a new blob with PNG MIME type
    const imageBlob = new Blob([pngBuffer], { type: 'image/png' })
    
    // Create form data
    const formData = new FormData()
    formData.append("file", imageBlob, `image.png`)
    formData.append("type", type)
    if (appId) formData.append("appId", appId)
    
    // Upload to our API using absolute URL
    const uploadUrl = process.env.NEXT_PUBLIC_APP_URL 
      ? new URL("/api/upload", process.env.NEXT_PUBLIC_APP_URL).toString()
      : "http://localhost:3000/api/upload"
      
    console.log("Uploading to:", uploadUrl)
    
    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    })
    
    if (!uploadResponse.ok) {
      const error = await uploadResponse.json()
      console.error("Failed to upload image:", error)
      return null
    }
    
    const { url: localUrl } = await uploadResponse.json()
    return localUrl
  } catch (error) {
    console.error("Error downloading image:", error)
    return null
  }
}

export function buildUrl(baseUrl: string, path: string): string {
  if (path.startsWith('http')) return path
  return path.startsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`
} 