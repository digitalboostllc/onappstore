"use client"

import Link from "next/link"
import { Search, AppWindow, Terminal, Wrench } from "lucide-react"
import { MainNav } from "@/components/layout/main-nav"
import { MobileNav } from "@/components/layout/mobile-nav"
import { UserNav } from "@/components/layout/user-nav"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSession } from "next-auth/react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface SearchResult {
  id: string
  name: string
  vendor: string | null
  category: {
    id: string
    name: string
  } | null
}

interface RecentApp {
  id: string
  name: string
  vendor: string | null
  category: {
    id: string
    name: string
  } | null
}

export function SiteHeader() {
  const { data: session } = useSession()
  const [search, setSearch] = useState("")
  const [showResults, setShowResults] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // Debounced search
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('#search-container')) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle search input
  useEffect(() => {
    if (!search) {
      setSearchResults([])
      return
    }

    const fetchResults = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(search)}`)
        if (!res.ok) throw new Error('Failed to fetch search results')
        const data = await res.json()
        setSearchResults(data)
      } catch (error) {
        setSearchResults([])
      } finally {
        setIsLoading(false)
      }
    }

    const timer = setTimeout(fetchResults, 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        const input = document.getElementById("search-input") as HTMLInputElement
        input?.focus()
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const categories = [
    {
      name: "Productivity",
      icon: AppWindow,
      href: "/apps?category=productivity"
    },
    {
      name: "Development",
      icon: Terminal,
      href: "/apps?category=development"
    },
    {
      name: "Utilities",
      icon: Wrench,
      href: "/apps?category=utilities"
    }
  ]

  const filteredCategories = search.length > 0
    ? categories.filter(category =>
        category.name.toLowerCase().includes(search.toLowerCase())
      )
    : categories

  const hasResults = searchResults.length > 0 || filteredCategories.length > 0

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="flex items-center flex-1">
          <MobileNav />
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <span className="hidden font-bold sm:inline-block">
                MacApps Hub
              </span>
            </Link>
          </div>
          <MainNav />
        </div>
        
        <div className="flex items-center space-x-4">
          <div id="search-container" className="relative md:w-64 lg:w-80">
            <div className="relative">
              <Input
                id="search-input"
                className="h-9 w-full pr-8"
                placeholder="Search apps..."
                value={search}
                onChange={(e) => {
                  const value = e.target.value
                  setSearch(value)
                  setShowResults(true)
                }}
                onFocus={() => setShowResults(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setShowResults(false)
                  }
                }}
              />
              <Search className={cn(
                "absolute right-3 top-2.5 h-4 w-4",
                isLoading ? "animate-spin text-primary" : "text-muted-foreground"
              )} />
              <kbd className="pointer-events-none absolute right-12 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                <span className="text-xs">⌘</span>K
              </kbd>
            </div>
            {showResults && (
              <div 
                className="absolute top-full mt-2 w-full bg-popover rounded-md border shadow-md z-50 max-h-[400px] overflow-auto"
                onMouseDown={(e) => e.preventDefault()}
              >
                <div className="p-2">
                  {search.length > 0 ? (
                    <>
                      {filteredCategories.length > 0 && (
                        <div className="space-y-1">
                          <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
                            Categories
                          </div>
                          <div className="space-y-1">
                            {filteredCategories.map((category) => (
                              <Button
                                key={category.name}
                                variant="ghost"
                                className="w-full justify-start text-sm"
                                onClick={() => {
                                  router.push(category.href)
                                  setShowResults(false)
                                  setSearch("")
                                }}
                              >
                                <category.icon className="mr-2 h-4 w-4" />
                                {category.name}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                      {searchResults.length > 0 && (
                        <div className={cn("space-y-1", filteredCategories.length > 0 && "mt-2")}>
                          <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
                            Apps
                          </div>
                          {searchResults.map((app) => (
                            <Button
                              key={app.id}
                              variant="ghost"
                              className="w-full justify-start text-sm"
                              onClick={() => {
                                router.push(`/apps/${app.id}`)
                                setShowResults(false)
                                setSearch("")
                              }}
                            >
                              <AppWindow className="mr-2 h-4 w-4" />
                              <div className="flex flex-col gap-1">
                                <Link
                                  href={`/apps/${app.id}`}
                                  className="font-medium hover:underline"
                                >
                                  {app.name}
                                </Link>
                                {(app.vendor || app.category) && (
                                  <p className="text-sm text-muted-foreground">
                                    {[
                                      app.vendor,
                                      app.category?.name
                                    ].filter(Boolean).join(" • ")}
                                  </p>
                                )}
                              </div>
                            </Button>
                          ))}
                        </div>
                      )}
                      {!hasResults && !isLoading && (
                        <div className="p-2 text-sm text-muted-foreground">
                          No results found for "{search}"
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-1">
                      <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
                        Categories
                      </div>
                      <div className="space-y-1">
                        {categories.map((category) => (
                          <Button
                            key={category.name}
                            variant="ghost"
                            className="w-full justify-start text-sm"
                            onClick={() => {
                              router.push(category.href)
                              setShowResults(false)
                              setSearch("")
                            }}
                          >
                            <category.icon className="mr-2 h-4 w-4" />
                            {category.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {session ? (
            <UserNav user={session.user} />
          ) : (
            <div className="flex items-center space-x-1">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Sign up</Button>
              </Link>
            </div>
          )}
          <ModeToggle />
        </div>
      </div>
    </header>
  )
} 