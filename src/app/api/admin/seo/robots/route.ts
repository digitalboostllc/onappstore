import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { writeFile } from "fs/promises"
import path from "path"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user?.isAdmin) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const robotsConfig = await prisma.robotsConfig.findFirst()
    return NextResponse.json(robotsConfig)
  } catch (error) {
    console.error("[ROBOTS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user?.isAdmin) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { useCustomContent, customContent, rules } = await req.json()

    // Generate robots.txt content
    let content = ""
    if (useCustomContent) {
      content = customContent
    } else {
      for (const rule of rules) {
        if (!rule.enabled) continue

        content += `User-agent: ${rule.userAgent}\n`
        for (const allow of rule.allow) {
          content += `Allow: ${allow}\n`
        }
        for (const disallow of rule.disallow) {
          content += `Disallow: ${disallow}\n`
        }
        content += "\n"
      }

      // Add sitemap URL
      content += "Sitemap: https://macappshub.com/sitemap.xml\n"
    }

    // Save to database
    const robotsConfig = await prisma.robotsConfig.upsert({
      where: { id: "1" }, // Single record
      create: {
        id: "1",
        useCustomContent,
        customContent,
        rules: rules as any,
      },
      update: {
        useCustomContent,
        customContent,
        rules: rules as any,
      },
    })

    // Write to robots.txt file
    const publicDir = path.join(process.cwd(), "public")
    await writeFile(path.join(publicDir, "robots.txt"), content)

    return NextResponse.json(robotsConfig)
  } catch (error) {
    console.error("[ROBOTS_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
} 