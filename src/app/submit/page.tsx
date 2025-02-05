import { Suspense } from "react"
import { AppForm } from "@/components/forms/app-form"
import { PageHeader } from "@/components/page-header"
import { getCategoriesWithStats } from "@/lib/categories"

export const dynamic = 'force-dynamic'

export default async function SubmitPage() {
  const categories = await getCategoriesWithStats()

  return (
    <div className="container py-8 space-y-8">
      <PageHeader>
        <PageHeader.Title>Submit Your App</PageHeader.Title>
        <PageHeader.Description>
          Share your app with the Mac community. Fill out the form below to submit your app for review.
        </PageHeader.Description>
      </PageHeader>

      <Suspense fallback={<div>Loading...</div>}>
        <AppForm categories={categories} />
      </Suspense>
    </div>
  )
} 