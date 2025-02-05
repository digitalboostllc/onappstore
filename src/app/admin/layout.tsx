import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth/utils"
import { AdminHeader } from "@/components/admin/header"
import { AdminTabs } from "@/components/admin/tabs"

const tabs = [
  {
    title: "Overview",
    href: "/admin",
  },
  {
    title: "Apps",
    href: "/admin/apps",
  },
  {
    title: "Comments",
    href: "/admin/comments",
  },
  {
    title: "Users",
    href: "/admin/users",
  },
  {
    title: "Import",
    href: "/admin/import",
  },
  {
    title: "Categories",
    href: "/admin/categories",
  },
  {
    title: "SEO",
    href: "/admin/seo",
  },
  {
    title: "Settings",
    href: "/admin/settings",
  },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user?.isAdmin) {
    redirect("/login")
  }

  return (
    <div className="container space-y-6 py-8">
      <AdminHeader />
      <AdminTabs />
      <main>{children}</main>
    </div>
  )
} 