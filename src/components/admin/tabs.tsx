"use client"

import { useRouter, usePathname } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function AdminTabs() {
  const router = useRouter()
  const pathname = usePathname()

  const getTabValue = (path: string) => {
    if (path === "/admin") return "overview"
    if (path.includes("/apps")) return "apps"
    if (path.includes("/comments")) return "comments"
    if (path.includes("/users")) return "users"
    if (path.includes("/import")) return "import"
    if (path.includes("/categories")) return "categories"
    if (path.includes("/seo")) return "seo"
    if (path.includes("/settings")) return "settings"
    return "overview"
  }

  return (
    <Tabs
      defaultValue={getTabValue(pathname)}
      onValueChange={(value) => {
        switch (value) {
          case "overview":
            router.push("/admin")
            break
          case "apps":
            router.push("/admin/apps")
            break
          case "comments":
            router.push("/admin/comments")
            break
          case "users":
            router.push("/admin/users")
            break
          case "import":
            router.push("/admin/import")
            break
          case "categories":
            router.push("/admin/categories")
            break
          case "seo":
            router.push("/admin/seo")
            break
          case "settings":
            router.push("/admin/settings")
            break
        }
      }}
    >
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="apps">Apps</TabsTrigger>
        <TabsTrigger value="comments">Comments</TabsTrigger>
        <TabsTrigger value="users">Users</TabsTrigger>
        <TabsTrigger value="import">Import</TabsTrigger>
        <TabsTrigger value="categories">Categories</TabsTrigger>
        <TabsTrigger value="seo">SEO</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
    </Tabs>
  )
} 