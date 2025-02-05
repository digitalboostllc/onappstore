import { getCurrentUser } from "@/lib/session"
import { redirect } from "next/navigation"
import { CollectionForm } from "@/components/forms/collection-form"

export default async function NewCollectionPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }

  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Create Collection</h1>
        <CollectionForm />
      </div>
    </div>
  )
} 