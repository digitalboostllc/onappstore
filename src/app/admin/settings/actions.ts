"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import * as z from "zod"

const appSettingsSchema = z.object({
  appName: z.string().min(1),
  appDescription: z.string().min(1),
})

const emailSettingsSchema = z.object({
  emailProvider: z.enum(["smtp", "sendgrid", "mailgun"]),
  emailFrom: z.string().email(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
  apiKey: z.string().optional(),
})

const storageSettingsSchema = z.object({
  storageProvider: z.enum(["local", "s3", "cloudinary"]),
  maxFileSize: z.number().min(1),
  accessKeyId: z.string().optional(),
  secretAccessKey: z.string().optional(),
  bucket: z.string().optional(),
  region: z.string().optional(),
})

export async function updateAppSettings(data: z.infer<typeof appSettingsSchema>) {
  const user = await getCurrentUser()

  if (!user?.isAdmin) {
    throw new Error("Unauthorized")
  }

  const settings = await prisma.siteSettings.findFirst()

  if (settings) {
    await prisma.siteSettings.update({
      where: { id: settings.id },
      data,
    })
  } else {
    await prisma.siteSettings.create({
      data,
    })
  }

  revalidatePath("/admin/settings")
}

export async function updateEmailSettings(data: z.infer<typeof emailSettingsSchema>) {
  const user = await getCurrentUser()

  if (!user?.isAdmin) {
    throw new Error("Unauthorized")
  }

  const settings = await prisma.siteSettings.findFirst()

  if (settings) {
    await prisma.siteSettings.update({
      where: { id: settings.id },
      data,
    })
  } else {
    await prisma.siteSettings.create({
      data,
    })
  }

  revalidatePath("/admin/settings")
}

export async function updateStorageSettings(data: z.infer<typeof storageSettingsSchema>) {
  const user = await getCurrentUser()

  if (!user?.isAdmin) {
    throw new Error("Unauthorized")
  }

  const settings = await prisma.siteSettings.findFirst()

  if (settings) {
    await prisma.siteSettings.update({
      where: { id: settings.id },
      data,
    })
  } else {
    await prisma.siteSettings.create({
      data,
    })
  }

  revalidatePath("/admin/settings")
} 