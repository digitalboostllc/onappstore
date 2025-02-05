import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuth = !!token
    const isAuthPage = req.nextUrl.pathname.startsWith("/login") ||
      req.nextUrl.pathname.startsWith("/register")
    const isDashboard = req.nextUrl.pathname.startsWith("/dashboard")
    const isAdmin = req.nextUrl.pathname.startsWith("/admin")
    const isDeveloper = req.nextUrl.pathname.startsWith("/developer")

    // Handle non-authenticated users first
    if (!isAuth) {
      if (isAuthPage) {
        return null // Allow access to auth pages
      }
      let from = req.nextUrl.pathname
      if (req.nextUrl.search) {
        from += req.nextUrl.search
      }
      return NextResponse.redirect(
        new URL(`/login?from=${encodeURIComponent(from)}`, req.url)
      )
    }

    // For authenticated users:

    // Check admin access
    if (isAdmin) {
      // Explicitly check if isAdmin is true
      const userIsAdmin = token?.isAdmin === true
      console.log("Token:", token)
      console.log("Is admin route:", isAdmin)
      console.log("User is admin:", userIsAdmin)
      
      if (!userIsAdmin) {
        console.log("Access denied: User is not an admin")
        return NextResponse.redirect(new URL("/dashboard", req.url))
      }
      console.log("Admin access granted")
      return null
    }

    // Check developer access
    if (isDeveloper) {
      const userIsAdmin = token?.isAdmin === true
      if (!userIsAdmin) {
        return NextResponse.redirect(new URL("/login", req.url))
      }
      return null
    }

    // Handle auth pages for authenticated users
    if (isAuthPage) {
      const from = req.nextUrl.searchParams.get("from")
      if (from) {
        return NextResponse.redirect(new URL(from, req.url))
      }
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    return null
  },
  {
    callbacks: {
      authorized: ({ token }) => true,
    },
  }
)

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/developer/:path*", "/login", "/register"],
} 