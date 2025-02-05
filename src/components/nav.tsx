import { Bell, FolderHeart } from "lucide-react"

export const dashboardConfig = {
  sidebarNav: [
    {
      title: "Collections",
      href: "/dashboard/collections",
      icon: FolderHeart,
    },
    {
      title: "Notifications",
      href: "/dashboard/notifications",
      icon: Bell,
    },
  ],
} 