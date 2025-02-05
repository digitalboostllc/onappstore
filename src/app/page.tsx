import { Suspense } from "react"
import Link from "next/link"
import { 
  ArrowRight, 
  Download, 
  Search, 
  Shield, 
  Star, 
  Zap, 
  Heart, 
  Users, 
  Command,
  Code,
  Palette,
  Settings,
  Music,
  GraduationCap
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getApps } from "@/lib/services/app-service"
import type { AppWithDetails } from "@/lib/services/app-service"
import { AppGrid } from "@/components/apps/app-grid"
import { cn } from "@/lib/utils"
import { Metadata } from "next"
import { getMetaTags, getDefaultMetaTags } from "@/lib/meta"
import { SearchForm } from "@/components/search-form"

export const dynamic = 'force-dynamic'
export const revalidate = 0

const categories = [
  {
    title: "Productivity",
    icon: Command,
    color: "bg-blue-500/10 text-blue-500",
    count: 128,
  },
  {
    title: "Development",
    icon: Code,
    color: "bg-yellow-500/10 text-yellow-500",
    count: 84,
  },
  {
    title: "Design",
    icon: Palette,
    color: "bg-pink-500/10 text-pink-500",
    count: 67,
  },
  {
    title: "Utilities",
    icon: Settings,
    color: "bg-green-500/10 text-green-500",
    count: 152,
  },
  {
    title: "Entertainment",
    icon: Music,
    color: "bg-purple-500/10 text-purple-500",
    count: 93,
  },
  {
    title: "Education",
    icon: GraduationCap,
    color: "bg-orange-500/10 text-orange-500",
    count: 45,
  },
]

export async function generateMetadata(): Promise<Metadata> {
  try {
    const metaTags = await getMetaTags("home") || await getDefaultMetaTags()
    return {
      title: metaTags.title || 'Mac App Store',
      description: metaTags.description || 'Your Gateway to Mac Applications',
      keywords: metaTags.keywords,
      ...(metaTags.canonical ? {
        alternates: {
          canonical: metaTags.canonical
        }
      } : {})
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Mac App Store',
      description: 'Your Gateway to Mac Applications'
    }
  }
}

export default async function Home() {
  let apps: AppWithDetails[] = []
  
  try {
    const result = await getApps({
      sort: "popular",
      page: 1,
      limit: 6,
    })
    apps = result.apps
  } catch (error) {
    console.error('Error fetching apps:', error)
    // Continue with empty apps array
  }

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative w-full py-12 md:py-24 lg:py-32 xl:py-48 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-100/50 via-purple-100/50 to-rose-100/50 dark:from-blue-950/50 dark:via-purple-950/50 dark:to-rose-950/50" />
          <div className="absolute inset-0 bg-grid-black/[0.05] dark:bg-grid-white/[0.05]" />
        </div>
        <div className="container relative">
          <div className="flex flex-col items-center space-y-8 text-center">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl/none bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-gray-100 dark:via-gray-200 dark:to-gray-100">
                Your Gateway to Mac Applications
              </h1>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                Discover, download, and share amazing applications for your Mac. Join our growing community of developers and users.
              </p>
            </div>
            <div className="w-full max-w-2xl mx-auto">
              <Suspense fallback={<div>Loading...</div>}>
                <SearchForm />
              </Suspense>
            </div>
            <div className="space-x-4">
              <Link href="/apps">
                <Button size="lg" className="rounded-full">
                  Browse Apps
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard/submit">
                <Button variant="outline" size="lg" className="rounded-full">
                  Submit Your App
                  <Star className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="w-full py-12 md:py-24 border-t bg-muted/30">
        <div className="container">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row mb-8">
            <div className="flex flex-col items-start gap-2">
              <h2 className="text-3xl font-bold tracking-tighter">Browse Categories</h2>
              <p className="text-muted-foreground">
                Find the perfect apps for your needs
              </p>
            </div>
            <Link href="/categories">
              <Button variant="ghost">
                View all categories
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Link key={category.title} href={`/categories?category=${category.title.toLowerCase()}`}>
                <Card className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className={cn("p-3 rounded-full transition-colors", category.color)}>
                        <category.icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold group-hover:text-primary transition-colors">
                          {category.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {category.count} apps
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 border-t bg-background">
        <div className="container">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="group hover:shadow-lg transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex flex-col items-center space-y-4 text-center">
                  <div className="p-4 bg-blue-500/10 rounded-full">
                    <Search className="h-6 w-6 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-bold">Easy Discovery</h3>
                  <p className="text-muted-foreground">
                    Find the perfect apps with powerful search and filtering options
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="group hover:shadow-lg transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex flex-col items-center space-y-4 text-center">
                  <div className="p-4 bg-green-500/10 rounded-full">
                    <Shield className="h-6 w-6 text-green-500" />
                  </div>
                  <h3 className="text-xl font-bold">Safe Downloads</h3>
                  <p className="text-muted-foreground">
                    All apps are verified and scanned for security
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="group hover:shadow-lg transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex flex-col items-center space-y-4 text-center">
                  <div className="p-4 bg-purple-500/10 rounded-full">
                    <Zap className="h-6 w-6 text-purple-500" />
                  </div>
                  <h3 className="text-xl font-bold">Fast & Reliable</h3>
                  <p className="text-muted-foreground">
                    Quick downloads and automatic updates for all apps
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Popular Apps Section */}
      {apps.length > 0 && (
        <section className="w-full py-12 md:py-24 lg:py-32 border-t bg-muted/30">
          <div className="container">
            <div className="flex flex-col items-center justify-between gap-4 md:flex-row mb-8">
              <div className="flex flex-col items-start gap-2">
                <h2 className="text-3xl font-bold tracking-tighter">Popular Apps</h2>
                <p className="text-muted-foreground">
                  Discover the most downloaded and highly rated applications
                </p>
              </div>
            </div>
            <div className="mt-8">
              <Suspense fallback={<div>Loading apps...</div>}>
                <AppGrid
                  apps={apps}
                  total={apps.length}
                  pages={1}
                  currentPage={1}
                />
              </Suspense>
            </div>
          </div>
        </section>
      )}

      {/* Stats Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 border-y bg-background">
        <div className="container">
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="flex flex-col items-center justify-center space-y-2 text-center group">
              <div className="p-4 bg-blue-500/10 rounded-full transition-colors group-hover:bg-blue-500/20">
                <Users className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-3xl font-bold">10,000+</h3>
              <p className="text-muted-foreground">Active Users</p>
            </div>
            <div className="flex flex-col items-center justify-center space-y-2 text-center group">
              <div className="p-4 bg-green-500/10 rounded-full transition-colors group-hover:bg-green-500/20">
                <Download className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="text-3xl font-bold">50,000+</h3>
              <p className="text-muted-foreground">Downloads</p>
            </div>
            <div className="flex flex-col items-center justify-center space-y-2 text-center group">
              <div className="p-4 bg-purple-500/10 rounded-full transition-colors group-hover:bg-purple-500/20">
                <Heart className="h-8 w-8 text-purple-500" />
              </div>
              <h3 className="text-3xl font-bold">1,000+</h3>
              <p className="text-muted-foreground">Happy Developers</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative w-full py-12 md:py-24 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500" />
        <div className="absolute inset-0 bg-grid-white/[0.2]" />
        <div className="container relative">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter text-white sm:text-4xl md:text-5xl">
                Ready to Get Started?
              </h2>
              <p className="mx-auto max-w-[600px] text-white/90 md:text-xl">
                Join thousands of Mac users discovering new apps every day
              </p>
            </div>
            <Link href="/apps">
              <Button
                size="lg"
                variant="secondary"
                className="rounded-full bg-white hover:bg-white/90 text-gray-900"
              >
                Explore Apps
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
