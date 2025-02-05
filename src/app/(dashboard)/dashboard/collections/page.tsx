import { getCurrentUser } from "@/lib/session"
import { redirect } from "next/navigation"
import { collectionService } from "@/lib/services/collection-service"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/utils"
import type { Collection } from "@prisma/client"

export default async function CollectionsPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }

  const collections = await collectionService.getUserCollections(user.id)

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Collections</h1>
          <p className="text-muted-foreground">
            Create and manage your app collections
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/collections/new">
            <Plus className="w-4 h-4 mr-2" />
            New Collection
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((collection: Collection & { _count?: { apps: number } }) => (
          <Card key={collection.id}>
            <CardHeader>
              <CardTitle>
                <Link
                  href={`/dashboard/collections/${collection.id}`}
                  className="hover:underline"
                >
                  {collection.name}
                </Link>
              </CardTitle>
              <CardDescription>
                {collection.description || "No description"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                <p>{collection._count?.apps || 0} apps</p>
                <p>Created {formatDate(collection.createdAt.getTime())}</p>
                <p>{collection.isPublic ? "Public" : "Private"} collection</p>
              </div>
            </CardContent>
          </Card>
        ))}

        {collections.length === 0 && (
          <div className="col-span-full text-center py-12">
            <h3 className="text-lg font-semibold mb-2">No collections yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first collection to organize your favorite apps
            </p>
            <Button asChild>
              <Link href="/dashboard/collections/new">
                <Plus className="w-4 h-4 mr-2" />
                Create Collection
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
} 