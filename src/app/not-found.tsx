import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CommandIcon, HomeIcon, FolderSearch } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center">
      {/* Mac Window Style Container */}
      <div className="w-full max-w-2xl bg-background rounded-lg shadow-2xl border overflow-hidden">
        {/* Window Title Bar */}
        <div className="bg-muted px-4 py-2 flex items-center gap-2 border-b">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <div className="flex-1 text-center text-sm font-medium text-muted-foreground">
            Finder
          </div>
        </div>

        {/* Window Content */}
        <div className="p-8 space-y-6">
          {/* Terminal-style Error */}
          <div className="font-mono bg-muted p-4 rounded-lg text-left space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CommandIcon className="h-4 w-4" />
              <span>Error 404: Page not found</span>
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="text-blue-500">~</span>
              <span className="text-green-500">$</span> The requested file or directory could not be found
            </div>
            <div className="text-sm">
              <span className="text-yellow-500">⚠</span> Please check the path and try again
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Oops! File Not Found</h1>
            <p className="text-muted-foreground text-lg">
              The page you're looking for seems to have been moved, deleted, or never existed.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button asChild>
              <Link href="/">
                <HomeIcon className="mr-2 h-4 w-4" />
                Return Home
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/apps">
                <FolderSearch className="mr-2 h-4 w-4" />
                Browse Apps
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 