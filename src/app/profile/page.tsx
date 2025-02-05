import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UserProfileForm } from "@/components/forms/user-profile-form"

export default async function ProfilePage() {
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

      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Downloads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {userWithStats._count.downloads}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Favorites
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {userWithStats._count.favorites}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Ratings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {userWithStats._count.ratings}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update your account settings and profile information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UserProfileForm user={userWithStats} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 