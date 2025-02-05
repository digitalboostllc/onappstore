import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DeveloperProfileForm } from "@/components/forms/developer-profile-form"

export default async function DeveloperProfilePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  const developer = await prisma.developer.findUnique({
    where: { userId: user.id },
    include: {
      user: true,
    },
  })

  if (!developer) {
    // Create developer profile if it doesn't exist
    await prisma.developer.create({
      data: {
        userId: user.id,
      },
    })
    // Refresh the page to load the new developer profile
    redirect("/dashboard/profile")
  }

  return (
    <div className="container py-8 space-y-8">
      <h1 className="text-3xl font-bold">Developer Profile</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update your developer profile information visible to users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeveloperProfileForm developer={developer} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 