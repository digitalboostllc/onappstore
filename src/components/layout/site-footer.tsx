"use client"

import Link from "next/link"
import { Github } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SiteFooter() {
  return (
    <footer className="w-full border-t bg-background">
      <div className="container flex flex-col items-center justify-between gap-4 py-8 md:h-16 md:flex-row md:py-0">
        <div className="text-center text-sm leading-loose text-muted-foreground md:text-left">
          Built by{" "}
          <Link
            href="/"
            className="font-medium underline underline-offset-4"
          >
            MacApps Hub
          </Link>
          . The source code is available on{" "}
          <Link
            href="https://github.com"
            className="font-medium underline underline-offset-4"
          >
            GitHub
          </Link>
          .
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="https://github.com">
            <Github className="h-4 w-4" />
            <span className="sr-only">GitHub</span>
          </Link>
        </Button>
      </div>
    </footer>
  )
} 