"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"

export async function toggleAppStatus(id: string) {
  const user = await getCurrentUser()

  if (!user?.isAdmin) {
    throw new Error("Unauthorized")
  }

  const app = await prisma.app.findUnique({
    where: { id },
    select: { published: true },
  })

  if (!app) {
    throw new Error("App not found")
  }

  await prisma.app.update({
    where: { id },
    data: { published: !app.published },
  })

  revalidatePath("/admin")
}

export async function deleteApp(id: string) {
  const user = await getCurrentUser()

  if (!user?.isAdmin) {
    throw new Error("Unauthorized")
  }

  await prisma.app.delete({
    where: { id },
  })

  revalidatePath("/admin")
} 