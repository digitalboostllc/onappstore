import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/utils"
import { openai } from "@/lib/openai"

// Debug log for API key (remove in production)
console.log("OpenAI API Key:", process.env.OPENAI_API_KEY?.slice(0, 10) + "...")

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { content } = await req.json()
    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    // Debug log before making the API call
    console.log("Making OpenAI API call with key:", process.env.OPENAI_API_KEY?.slice(0, 10) + "...")

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are a professional app content writer. Your task is to enhance app descriptions and documentation while maintaining their core meaning and technical accuracy. 

Key guidelines:
- Maintain all HTML formatting (lists, paragraphs, bold, etc)
- Keep all technical details accurate (commands, shortcuts, requirements)
- Make the language more engaging and user-friendly
- Improve clarity and readability
- Keep the same overall structure
- Preserve any version numbers or specific technical terms

Return only the enhanced HTML content without any additional text or explanations.`
        },
        {
          role: "user",
          content: content
        }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    })

    const enhancedContent = completion.choices[0]?.message?.content

    if (!enhancedContent) {
      throw new Error("Failed to generate enhanced content")
    }

    return NextResponse.json({ enhancedContent })
  } catch (error: any) {
    console.error("[AI_ENHANCE] Error:", error.message || error)
    return NextResponse.json(
      { error: error.message || "Failed to enhance content" },
      { status: error.status || 500 }
    )
  }
} 