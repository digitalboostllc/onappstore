import { AppWindow, Bell, FolderHeart, Settings } from "lucide-react"

export const dashboardConfig = {
  sidebarNav: [
    {
      title: "My Apps",
      href: "/dashboard/apps",
      icon: AppWindow,
    },
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
    {
      title: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
    },
  ],
} 