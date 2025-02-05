"use client"

import Link from "next/link"
import Image from "next/image"
import { Download, Calendar, Package2, ShieldCheck, Star, Tag, FolderIcon, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { formatDate, cleanUrl, formatBytes } from "@/lib/utils"
import type { AppWithDetails } from "@/lib/services/app-service"
import { cn } from "@/lib/utils"

interface AppCardProps {
  app: AppWithDetails
  className?: string
}

export function AppCard({ app, className }: AppCardProps) {
  const latestVersion = app.version
  const averageRating = app.averageRating || 0
  const totalRatings = app._count.ratings || 0
  const totalDownloads = app._count.downloads || 0
  const displayPrice = !app.price || app.price === "Free" ? "FREE" : `${app.price} USD`
  const isPriceSecondary = !app.price || app.price === "Free"

  return (
    <Card className={cn("overflow-hidden group hover:shadow-md transition-all duration-200", className)}>
      <Link href={`/apps/${app.id}`}>
        <div className="relative aspect-square p-6 group-hover:scale-[1.02] transition-transform duration-200">
          <div className="relative h-full w-full rounded-xl border bg-muted">
            {app.icon ? (
              <Image
                src={app.icon}
                alt={app.name}
                className="object-contain p-6"
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                quality={95}
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Package2 className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      </Link>

      <CardContent className="grid gap-3 p-4">
        <div className="space-y-2">
          <div className="space-y-1">
            <Link
              href={`/apps/${app.id}`}
              className="font-semibold hover:text-primary transition-colors line-clamp-1 text-lg"
            >
              {app.name}
            </Link>
            {app.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {app.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {app.category && (
              <Badge variant="outline" className="flex items-center gap-1.5">
                <FolderIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <Link 
                  href={`/categories?category=${app.category.id}${app.subcategory ? `&subcategory=${app.subcategory.id}` : ''}`} 
                  className="hover:text-foreground"
                >
                  {app.subcategory ? app.subcategory.name : app.category.name}
                </Link>
              </Badge>
            )}
          </div>
        </div>

        <div className="grid gap-2 text-sm">
          <div className="grid grid-cols-2 gap-2 border-t pt-2">
            <div className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 fill-primary text-primary" />
              <span>{averageRating.toFixed(1)}</span>
              <span className="text-muted-foreground">({totalRatings})</span>
            </div>
            <div className="flex items-center gap-1.5 justify-end">
              <Download className="h-3.5 w-3.5" />
              <span>{totalDownloads.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between border-t pt-2">
            {latestVersion && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Tag className="h-3.5 w-3.5" />
                <span>{latestVersion}</span>
              </div>
            )}
            <Badge 
              variant={isPriceSecondary ? "secondary" : "default"} 
              className="font-normal text-xs shrink-0"
            >
              {displayPrice}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 