import Link from "next/link"
import { Button } from "@/components/ui/button"
import { HomeIcon } from "lucide-react"

export default function NotFound() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-[600px] gap-4">
      <div className="space-y-4 text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-xl text-muted-foreground">This page could not be found.</p>
      </div>
      <Button asChild>
        <Link href="/">
          <HomeIcon className="mr-2 h-4 w-4" />
          Return Home
        </Link>
      </Button>
    </div>
  )
} 