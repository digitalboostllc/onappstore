import type { Session, User } from "next-auth"
import type { JWT } from "next-auth/jwt"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

interface ExtendedUser extends User {
  isAdmin: boolean
}

export const authConfig = {
  adapter: PrismaAdapter(prisma) as any, // Type assertion needed due to version mismatch
  session: {
    strategy: "jwt" as const,
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }: { auth: { user: ExtendedUser } | null, request: { nextUrl: URL } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard")
      const isOnAdmin = nextUrl.pathname.startsWith("/admin")
      
      if (isOnDashboard || isOnAdmin) {
        if (isLoggedIn) return true
        return false
      } else if (isLoggedIn) {
        return true
      }
      return true
    },
    async session({ session, token }: { session: Session, token: JWT }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.sub,
          isAdmin: false, // Default value for isAdmin
        } as ExtendedUser,
      }
    },
  },
  providers: [], // Providers will be added in auth.ts
} 