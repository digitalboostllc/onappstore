import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { redirect } from "next/navigation"

export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  return session?.user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }
  return user
}

export async function isAuthenticated() {
  const session = await getServerSession(authOptions)
  return !!session?.user
}

export async function isAdmin() {
  const user = await getCurrentUser()
  return user?.isAdmin || false
}

export async function checkAdminAccess() {
  const user = await getCurrentUser()
  
  if (!user?.isAdmin) {
    redirect("/")
  }
} 