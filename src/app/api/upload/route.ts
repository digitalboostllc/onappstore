import { NextRequest, NextResponse } from "next/server"
import { put } from '@vercel/blob'
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
    let contentType = file.type
    if (file.type.startsWith('image/')) {
      processedBuffer = await sharp(buffer)
        .png({ quality: 90 })
        .toBuffer()
      contentType = 'image/png'
    }

    // Generate unique filename
    const ext = file.type.startsWith('image/') ? 'png' : file.type.split("/")[1] || "bin"
    const filename = `${crypto.randomUUID()}.${ext}`
    
    // Construct the path based on type and appId
    const pathname = appId 
      ? `${type}/${appId}/${filename}`
      : `${type}/${filename}`

    // Upload to Vercel Blob
    const blob = await put(pathname, processedBuffer, {
      contentType,
      access: 'public',
    })
    
    return NextResponse.json({ url: blob.url })
  } catch (error: any) {
    console.error("[UPLOAD_ERROR]", error)
    return NextResponse.json(
      { error: error.message || "Failed to upload file" },
      { status: 500 }
    )
  }
} 