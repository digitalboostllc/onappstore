import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/utils"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import crypto from "crypto"
import sharp from "sharp"

// Define allowed MIME types and their extensions
const mimeToExt: { [key: string]: string } = {
  'image/jpeg': '.png', // Convert all images to PNG
  'image/jpg': '.png',
  'image/png': '.png',
  'image/webp': '.png',
  'image/gif': '.png'
}

export async function POST(request: NextRequest) {
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
    const fileExt = mimeToExt[file.type] || '.bin'
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // If it's an image, process it with sharp
    let processedBuffer = buffer
    if (file.type.startsWith('image/')) {
      processedBuffer = await sharp(buffer)
        .png({ quality: 90 })
        .toBuffer()
    }
    
    // Generate unique filename with proper extension
    const fileName = `${crypto.randomUUID()}${fileExt}`
    
    // Create directories if they don't exist
    const baseDir = path.join(process.cwd(), 'public/uploads')
    const typeDir = path.join(baseDir, type)
    await mkdir(typeDir, { recursive: true })

    // Write file
    const filePath = path.join(typeDir, fileName)
    await writeFile(filePath, processedBuffer)
    
    // Return the public URL (relative to /public)
    const url = `/uploads/${type}/${fileName}`
    
    return NextResponse.json({ url })
  } catch (error: any) {
    console.error("[UPLOAD_ERROR]", error)
    return NextResponse.json(
      { error: error.message || "Failed to upload file" },
      { status: 500 }
    )
  }
} 