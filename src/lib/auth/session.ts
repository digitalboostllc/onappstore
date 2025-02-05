import { getServerSession } from "next-auth"
import { authConfig } from "./auth.config"

export async function getCurrentUser() {
  try {
    const session = await getServerSession(authConfig)
    return session?.user
  } catch {
    return null
  }
} 