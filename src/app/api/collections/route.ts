import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { collectionService } from "@/lib/services/collection-service"
import { z } from "zod"

const createCollectionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
})

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const json = await req.json()
    const body = createCollectionSchema.parse(json)

    const collection = await collectionService.createCollection(user.id, body)
    return NextResponse.json(collection)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 422 })
    }
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const collections = await collectionService.getUserCollections(user.id)
    return NextResponse.json(collections)
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 })
  }
} 