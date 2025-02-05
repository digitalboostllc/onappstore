import { Metadata } from "next"
import { SEOTabs } from "@/components/admin/seo/seo-tabs"

export const metadata: Metadata = {
  title: "Admin | SEO Management",
  description: "Manage SEO settings and metadata for the platform",
}

export default async function AdminSEOPage() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">SEO Management</h1>
        <p className="text-muted-foreground">
          Manage SEO settings, meta tags, and optimize content for search engines.
        </p>
      </div>
      <SEOTabs />
    </div>
  )
} 