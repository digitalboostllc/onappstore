import fs from 'fs'
import path from 'path'
import { promises as fsPromises } from 'fs'

// Function to delete a file if it exists
export async function deleteFileIfExists(filePath: string) {
  try {
    await fsPromises.access(filePath)
    await fsPromises.unlink(filePath)
  } catch (error) {
    // File doesn't exist or other error, we can ignore
  }
}

// Function to extract filename from URL
export function getFilenameFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url)
    return path.basename(urlObj.pathname)
  } catch {
    // If URL is invalid, try to get the last part of the path
    return url.split('/').pop() || null
  }
}

// Function to clean up app files
export async function cleanupAppFiles(app: { 
  icon: string | null, 
  screenshots: string[] 
}) {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads')

  // Clean up icon
  if (app.icon) {
    const iconFilename = getFilenameFromUrl(app.icon)
    if (iconFilename) {
      await deleteFileIfExists(path.join(uploadsDir, 'icon', iconFilename))
    }
  }

  // Clean up screenshots
  if (app.screenshots && app.screenshots.length > 0) {
    for (const screenshot of app.screenshots) {
      const screenshotFilename = getFilenameFromUrl(screenshot)
      if (screenshotFilename) {
        await deleteFileIfExists(path.join(uploadsDir, 'screenshot', screenshotFilename))
      }
    }
  }
} 