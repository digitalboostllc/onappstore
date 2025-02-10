import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import crypto from "crypto"
import sharp from "sharp"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const type = formData.get("type") as string
    const appId = formData.get("appId") as string
    
    if (!file || !type) {
      return NextResponse.json(
        { error: "File and type are required" },
        { status: 400 }
      )
    }

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

    // Generate unique filename
    const ext = file.type.startsWith('image/') ? 'png' : file.type.split("/")[1] || "bin"
    const filename = `${crypto.randomUUID()}.${ext}`
    
    // Create directories if they don't exist
    const baseDir = path.join(process.cwd(), 'public/uploads')
    const typeDir = path.join(baseDir, type)
    await mkdir(typeDir, { recursive: true })

    // Create app directory if appId is provided
    const uploadDir = appId 
      ? path.join(typeDir, appId)
      : typeDir
    await mkdir(uploadDir, { recursive: true })

    // Write file
    const filePath = path.join(uploadDir, filename)
    await writeFile(filePath, processedBuffer)
    
    // Return the public URL (relative to /public)
    const url = `/uploads/${type}${appId ? `/${appId}` : ''}/${filename}`
    
    return NextResponse.json({ url })
  } catch (error: any) {
    console.error("[UPLOAD_ERROR]", error)
    return NextResponse.json(
      { error: error.message || "Failed to upload file" },
      { status: 500 }
    )
  }
} 