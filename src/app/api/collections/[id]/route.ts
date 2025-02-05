import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { collectionService } from "@/lib/services/collection-service"
import { z } from "zod"

const updateCollectionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
})

export async function GET(
  request: Request
) {
  try {
    const id = request.url.split('/').pop()
    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 })
    }

    const collection = await collectionService.getCollection(id)
    if (!collection) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 })
    }

    // If collection is private, check if user is owner
    if (!collection.isPublic) {
      const user = await getCurrentUser()
      if (!user || user.id !== collection.userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    return NextResponse.json(collection)
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

export async function PATCH(
  request: Request
) {
  try {
    const id = request.url.split('/').pop()
    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 })
    }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const json = await request.json()
    const body = updateCollectionSchema.parse(json)

    const collection = await collectionService.updateCollection(id, user.id, body)
    return NextResponse.json(collection)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 422 })
    }
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request
) {
  try {
    const id = request.url.split('/').pop()
    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 })
    }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await collectionService.deleteCollection(id, user.id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
} 