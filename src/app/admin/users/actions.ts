"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"

export async function toggleUserRole(id: string) {
  const currentUser = await getCurrentUser()

  if (!currentUser?.isAdmin) {
    throw new Error("Unauthorized")
  }

  // Don't allow users to remove their own admin status
  if (currentUser.id === id) {
    throw new Error("You cannot modify your own role")
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { isAdmin: true },
  })

  if (!user) {
    throw new Error("User not found")
  }

  await prisma.user.update({
    where: { id },
    data: { isAdmin: !user.isAdmin },
  })

  revalidatePath("/admin/users")
}

export async function deleteUser(id: string) {
  const currentUser = await getCurrentUser()

  if (!currentUser?.isAdmin) {
    throw new Error("Unauthorized")
  }

  // Don't allow users to delete themselves
  if (currentUser.id === id) {
    throw new Error("You cannot delete your own account")
  }

  // Delete the user's developer profile and apps first
  await prisma.developer.delete({
    where: { userId: id },
  })

  await prisma.user.delete({
    where: { id },
  })

  revalidatePath("/admin/users")
} 