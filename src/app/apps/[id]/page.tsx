import Image from "next/image"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth/utils"
import { formatDate } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getApp, getSimilarApps, type AppWithDetails } from "@/lib/services/app-service"
import { AppHeaderOverview } from "@/components/apps/app-header-overview"
import { AppFeedback } from "@/components/apps/app-feedback"
import { AppVersions } from "@/components/apps/app-versions"
import { AppGrid } from "@/components/apps/app-grid"
import { Separator } from "@/components/ui/separator"
import { AppSidebar } from "@/components/apps/app-sidebar"
import { cn } from "@/lib/utils"
import type { Metadata } from "next"
import type { ResolvingMetadata } from 'next'
import { getCategories, type CategoryWithStats } from "@/lib/categories"

// Set revalidate to 0 to opt out of static generation
export const revalidate = 0

export default async function AppPage(props: any) {
  const id = props.params?.id
  if (!id) {
    notFound()
  }

  const app = await getApp(id)
  if (!app) {
    notFound()
  }

  const similarApps = await getSimilarApps(id)
  const user = await getCurrentUser()
  const isAdmin = user?.isAdmin
  const categories = await getCategories()

  return (
    <div className="container py-8">
      <div className={cn(
        "flex flex-col-reverse md:flex-row gap-6 relative",
        app.published ? [
          "before:absolute before:inset-0 before:rounded-lg before:border-2 before:border-dashed before:border-green-500/50 before:-m-2 before:-z-10",
          "after:absolute after:top-0 after:right-0 after:px-3 after:py-1 after:bg-green-500/10 after:text-green-700 after:text-sm after:font-medium after:rounded-bl-lg after:content-['Published'] after:z-10"
        ] : [
          "before:absolute before:inset-0 before:rounded-lg before:border-2 before:border-dashed before:border-yellow-500/50 before:-m-2 before:-z-10",
          "after:absolute after:top-0 after:right-0 after:px-3 after:py-1 after:bg-yellow-500/10 after:text-yellow-700 after:text-sm after:font-medium after:rounded-bl-lg after:content-['Draft'] after:z-10"
        ]
      )}>
        <aside className="md:w-[280px] space-y-3 md:sticky md:top-[73px] md:h-fit rounded-lg bg-muted/50 p-3">
          <AppSidebar app={app} />
        </aside>
        
        <main className="flex-1 min-w-0 space-y-8">
          <AppHeaderOverview app={app} categories={categories} />
          <AppVersions app={app} />
          <AppFeedback app={app} />

          {similarApps && similarApps.length > 0 && (
            <section className="w-full py-12 md:py-24 lg:py-32 border-t bg-muted/30">
              <div className="container">
                <div className="flex flex-col items-center justify-between gap-4 md:flex-row mb-8">
                  <div className="flex flex-col items-start gap-2">
                    <h2 className="text-3xl font-bold tracking-tighter">Similar Apps</h2>
                    <p className="text-muted-foreground">
                      You might also like these apps
                    </p>
                  </div>
                </div>
                <div className="mt-8">
                  <AppGrid
                    apps={similarApps?.map(app => ({
                      ...app,
                      averageRating: app.averageRating || 0
                    })) || []}
                    total={similarApps?.length || 0}
                    pages={1}
                    currentPage={1}
                  />
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  )
}

export async function generateMetadata(
  props: any,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const id = props.params?.id
  if (!id) {
    return {}
  }

  const app = await getApp(id)
  
  if (!app) {
    return {}
  }

  // First try to get custom meta tags from the database
  const customMetaTags = await prisma.seoMetaTag.findUnique({
    where: { page: `apps/${app.id}` }
  })

  if (customMetaTags) {
    return {
      title: customMetaTags.title,
      description: customMetaTags.description,
      keywords: customMetaTags.keywords,
      ...(customMetaTags.canonical ? {
        alternates: {
          canonical: customMetaTags.canonical
        }
      } : {})
    }
  }

  // If no custom meta tags, use the template
  const { metaTemplates, applyMetaTemplate } = await import("@/lib/meta-templates")
  const metaTags = applyMetaTemplate("app", app)

  return {
    title: metaTags.title,
    description: metaTags.description,
    keywords: metaTags.keywords,
    ...(metaTags.canonical ? {
      alternates: {
        canonical: metaTags.canonical
      }
    } : {})
  }
} 