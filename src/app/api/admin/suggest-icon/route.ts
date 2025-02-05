import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { openai } from "@/lib/openai"
import * as LucideIcons from "lucide-react"

// Get valid icon names from Lucide
const validIconNames = Object.keys(LucideIcons).filter(
  name => 
    name !== 'createLucideIcon' && 
    name !== 'default' && 
    /^[A-Z]/.test(name)
)

export async function POST(request: Request) {
  try {
    // Check if user is authenticated and is admin
    const session = await getServerSession(authOptions)
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get category name from request body
    const { categoryName, description } = await request.json()
    if (!categoryName) {
      return NextResponse.json({ error: "No category name provided" }, { status: 400 })
    }

    // Call OpenAI API to suggest an icon
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant that suggests appropriate Lucide icons for categories. Your task is to suggest a single icon name that best represents the given category. You MUST ONLY respond with one of these exact icon names, nothing else:

${validIconNames.join(", ")}

Do not add any explanation or additional text. Just return the exact icon name from the list.`
        },
        {
          role: "user",
          content: `Suggest a Lucide icon name for this category:
Name: ${categoryName}${description ? `\nDescription: ${description}` : ''}`
        }
      ],
      temperature: 0.3,
      max_tokens: 50,
    })

    const suggestedIcon = completion.choices[0].message.content?.trim()

    if (!suggestedIcon || !validIconNames.includes(suggestedIcon)) {
      return NextResponse.json({ error: "Invalid icon suggestion" }, { status: 500 })
    }

    return NextResponse.json({ icon: suggestedIcon })
  } catch (error) {
    console.error("Error suggesting icon:", error)
    return NextResponse.json(
      { error: "Failed to suggest icon" },
      { status: 500 }
    )
  }
} 