"use client"

import { useSearchParams } from "next/navigation"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

export function SearchForm() {
  const searchParams = useSearchParams()
  const query = searchParams.get("q") || ""

  return (
    <form action="/search" className="relative">
      <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        name="q"
        defaultValue={query}
        placeholder="Search for apps..."
        className="pl-10 h-12 rounded-full bg-background/80 backdrop-blur-sm border-muted"
      />
    </form>
  )
} 