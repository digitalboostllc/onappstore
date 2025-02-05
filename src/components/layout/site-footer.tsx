"use client"

import Link from "next/link"
import { Github } from "lucide-react"
import { Button } from "@/components/ui/button"

const footerLinks = [
  {
    title: "Product",
    links: [
      { title: "Browse Apps", href: "/apps" },
      { title: "Categories", href: "/categories" },
    ],
  },
  {
    title: "Developers",
    links: [
      { title: "Submit App", href: "/submit" },
      { title: "Documentation", href: "/docs" },
      { title: "API", href: "/api-docs" },
      { title: "Status", href: "/status" },
    ],
  },
  {
    title: "Company",
    links: [
      { title: "About", href: "/about" },
      { title: "Blog", href: "/blog" },
      { title: "Careers", href: "/careers" },
      { title: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { title: "Privacy", href: "/privacy" },
      { title: "Terms", href: "/terms" },
      { title: "Cookie Policy", href: "/cookies" },
      { title: "Licenses", href: "/licenses" },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="w-full border-t bg-background">
      <div className="container grid gap-8 py-8 md:grid-cols-2 lg:grid-cols-4">
        {footerLinks.map((group) => (
          <div key={group.title} className="space-y-3">
            <h4 className="text-sm font-medium">{group.title}</h4>
            <ul className="space-y-2">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="container flex flex-col items-center justify-between gap-4 border-t py-8 md:h-16 md:flex-row md:py-0">
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