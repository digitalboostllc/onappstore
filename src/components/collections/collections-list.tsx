import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/utils"
import type { Collection } from "@prisma/client"

interface CollectionsListProps {
  collections: (Collection & {
    _count?: {
      apps: number
    }
  })[]
}

export function CollectionsList({ collections }: CollectionsListProps) {
  if (collections.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold mb-2">No collections yet</h3>
        <p className="text-muted-foreground mb-4">
          Create your first collection to organize your favorite apps
        </p>
        <Button asChild>
          <Link href="/collections/new">
            <Plus className="w-4 h-4 mr-2" />
            Create Collection
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {collections.map((collection) => (
        <div key={collection.id} className="flex flex-col space-y-2">
          <h3 className="font-medium">
            <Link
              href={`/collections/${collection.id}`}
              className="hover:underline"
            >
              {collection.name}
            </Link>
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {collection.description || "No description"}
          </p>
          <div className="text-sm text-muted-foreground">
            <p>{collection._count?.apps || 0} apps</p>
            <p>Created {formatDate(collection.createdAt.getTime())}</p>
            <p>{collection.isPublic ? "Public" : "Private"} collection</p>
          </div>
        </div>
      ))}
    </div>
  )
} 