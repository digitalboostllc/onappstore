import { prisma } from "@/lib/db"

export type SocialLinks = {
  twitter?: string
  github?: string
  discord?: string
  website?: string
}

export interface UpdateSettingsData {
  siteName?: string
  siteDescription?: string
  allowAppSubmissions?: boolean
  maxFileSize?: number
  allowUserRegistration?: boolean
  requireEmailVerification?: boolean
  socialLinks?: SocialLinks
}

export async function getSettings() {
  const settings = await prisma.siteSettings.findFirst()
  if (!settings) {
    return prisma.siteSettings.create({
      data: {
        socialLinks: {
          twitter: "",
          github: "",
          discord: "",
          website: ""
        }
      } // Will use default values from schema
    })
  }
  return {
    ...settings,
    socialLinks: settings.socialLinks as SocialLinks || {
      twitter: "",
      github: "",
      discord: "",
      website: ""
    }
  }
}

export async function updateSettings(data: UpdateSettingsData) {
  const settings = await prisma.siteSettings.findFirst()
  
  if (!settings) {
    return prisma.siteSettings.create({
      data
    })
  }

  return prisma.siteSettings.update({
    where: { id: settings.id },
    data
  })
} 