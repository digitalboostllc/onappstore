import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth/utils"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { CollectionsList } from "@/components/collections/collections-list"

export const dynamic = 'force-dynamic'

export default async function CollectionsPage() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      redirect("/login")
    }

    const collections = await prisma.collection.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: { apps: true }
        }
      },
      orderBy: { updatedAt: "desc" }
    })

    return (
      <div className="container py-8 space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">My Collections</h1>
          <Button asChild>
            <Link href="/collections/new">Create Collection</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Collections Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <CollectionsList collections={collections} />
          </CardContent>
        </Card>
      </div>
    )
  } catch (error) {
    console.error("[COLLECTIONS]", error)
    redirect("/login")
  }
} 