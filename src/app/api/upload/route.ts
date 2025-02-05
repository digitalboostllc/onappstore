import { writeFile, mkdir } from "fs/promises"
import { NextRequest, NextResponse } from "next/server"
import path from "path"
import crypto from "crypto"

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

    // Create base uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), "public", "uploads")
    await mkdir(uploadsDir, { recursive: true })
    
    // Create type directory (icon/screenshot)
    const typeDir = path.join(uploadsDir, type)
    await mkdir(typeDir, { recursive: true })
    
    // Create app directory if appId is provided
    let targetDir = typeDir
    if (appId) {
      targetDir = path.join(typeDir, appId)
      await mkdir(targetDir, { recursive: true })
    }

    // Generate unique filename
    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    const ext = file.type.split("/")[1] || "png"
    const filename = `${crypto.randomUUID()}.${ext}`
    const filepath = path.join(targetDir, filename)
    
    // Write file
    await writeFile(filepath, bytes)
    
    // Return the public URL
    const publicPath = path.join("/uploads", type, appId || "", filename)
    
    return NextResponse.json({ url: publicPath })
  } catch (error: any) {
    console.error("Error uploading file:", error)
    return NextResponse.json(
      { error: error.message || "Failed to upload file" },
      { status: 500 }
    )
  }
} 