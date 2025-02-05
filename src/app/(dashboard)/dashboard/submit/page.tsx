import { getCurrentUser } from "@/lib/auth/utils"
import { redirect } from "next/navigation"
import { AppForm } from "@/components/forms/app-form"
import { getCategories } from "@/lib/categories"

export default async function SubmitPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  const categories = await getCategories()

  return (
    <div className="container py-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold">Submit Your App</h1>
          <p className="text-muted-foreground">
            Fill out the form below to submit your app for review. We&apos;ll review
            your submission and get back to you as soon as possible.
          </p>
          <AppForm categories={categories} />
        </div>
      </div>
    </div>
  )
} 