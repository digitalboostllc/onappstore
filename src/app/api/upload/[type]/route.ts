import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/utils"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import crypto from "crypto"

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'public/uploads')

// Define allowed MIME types and their extensions
const mimeToExt: { [key: string]: string } = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
}

export async function POST(
  request: NextRequest
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const type = request.url.split('/').pop()
    if (!type) {
      return NextResponse.json({ error: "Missing upload type" }, { status: 400 })
    }

    const data = await request.formData()
    const file = data.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Get proper file extension based on MIME type
    const fileExt = mimeToExt[file.type] || path.extname(file.name) || '.png'
    
    // Generate unique filename with proper extension
    const fileName = `${crypto.randomUUID()}${fileExt}`
    const typeDir = path.join(uploadDir, type)
    const filePath = path.join(typeDir, fileName)
    
    // Create directories if they don't exist
    try {
      await mkdir(typeDir, { recursive: true })
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        throw error
      }
    }

    // Convert File to Buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Save file
    await writeFile(filePath, buffer)

    // Return the URL that can be used to access the file
    const url = `/uploads/${type}/${fileName}`

    return NextResponse.json({ url })
  } catch (error) {
    console.error("[UPLOAD_ERROR]", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

async function createDirIfNotExists(dir: string) {
  try {
    await writeFile(dir, '', { flag: 'wx' })
  } catch (error: any) {
    if (error.code === 'EISDIR') {
      // Directory already exists, which is fine
      return
    }
    if (error.code === 'ENOENT') {
      // Parent directory doesn't exist, create it
      const parentDir = path.dirname(dir)
      await createDirIfNotExists(parentDir)
      await writeFile(dir, '', { flag: 'wx' })
    }
  }
} 