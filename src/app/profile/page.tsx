import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth/utils"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UserProfileForm } from "@/components/forms/user-profile-form"

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      redirect("/login")
    }

    const userWithStats = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        _count: {
          select: {
            downloads: true,
            favorites: true,
            ratings: true,
          },
        },
      },
    })

    if (!userWithStats) {
      redirect("/login")
    }

    return (
      <div className="container py-8 space-y-8">
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update your profile information visible to other users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UserProfileForm user={userWithStats} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity Overview</CardTitle>
            <CardDescription>
              Your activity statistics on the platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-2xl font-bold">{userWithStats._count.downloads}</p>
                <p className="text-sm text-muted-foreground">Downloads</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{userWithStats._count.favorites}</p>
                <p className="text-sm text-muted-foreground">Favorites</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{userWithStats._count.ratings}</p>
                <p className="text-sm text-muted-foreground">Reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  } catch (error) {
    console.error("[PROFILE]", error)
    redirect("/login")
  }
} 