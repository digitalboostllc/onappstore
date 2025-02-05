import { Metadata } from "next"
import { getSettings } from "@/lib/services/settings-service"
import { AdminSettingsForm } from "@/components/forms/admin-settings-form"
import type { SocialLinks } from "@/lib/services/settings-service"

export const metadata: Metadata = {
  title: "Admin | Settings",
  description: "Manage site settings and configurations",
}

export default async function AdminSettingsPage() {
  const settings = await getSettings()

  // Transform settings to match form's expected shape
  const formData = {
    siteName: settings.siteName,
    siteDescription: settings.siteDescription,
    allowAppSubmissions: settings.allowAppSubmissions,
    maxFileSize: settings.maxFileSize,
    allowUserRegistration: settings.allowUserRegistration,
    requireEmailVerification: settings.requireEmailVerification,
    socialLinks: (settings.socialLinks as SocialLinks) || {
      twitter: "",
      github: "",
      discord: "",
      website: ""
    }
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Site Settings</h1>
        <p className="text-muted-foreground">
          Manage your site's global settings and configurations.
        </p>
      </div>
      <div className="grid gap-6">
        <AdminSettingsForm initialData={formData} />
      </div>
    </div>
  )
} 