"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function AdminHeader() {
  const router = useRouter()

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your apps, users, and settings
        </p>
      </div>
      <div className="flex items-center gap-4">
        <Button onClick={() => router.push("/")}>View Site</Button>
      </div>
    </div>
  )
} 