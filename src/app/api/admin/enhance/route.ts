import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  try {
    // Check if user is authenticated and is admin
    const session = await getServerSession(authOptions)
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get content from request body
    const { content } = await request.json()
    if (!content) {
      return NextResponse.json({ error: "No content provided" }, { status: 400 })
    }

    // Call OpenAI API to enhance the content
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a professional technical writer who specializes in writing app descriptions. Your task is to enhance the given app description to make it more engaging, informative, and well-structured while maintaining accuracy and professionalism. Keep the same HTML formatting but improve the content."
        },
        {
          role: "user",
          content: `Please enhance this app description while keeping the HTML formatting: ${content}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    })

    const enhancedContent = completion.choices[0].message.content

    return NextResponse.json({ enhancedContent })
  } catch (error) {
    console.error("Error enhancing content:", error)
    return NextResponse.json(
      { error: "Failed to enhance content" },
      { status: 500 }
    )
  }
} 