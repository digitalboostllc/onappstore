import { Metadata } from "next"
import { getUsers } from "@/lib/services/user-service"
import { UsersTable } from "@/components/admin/users-table"
import { checkAdminAccess } from "@/lib/auth/utils"
import { getCurrentUser } from "@/lib/auth/utils"

export const metadata: Metadata = {
  title: "Admin | Users",
  description: "Manage users and permissions",
}

interface PageProps {
  searchParams: Promise<{
    search?: string
    role?: string
    status?: string
    page?: string
  }>
}

export default async function AdminUsersPage({
  searchParams,
}: PageProps) {
  // Ensure admin access first
  await checkAdminAccess()

  // Get current user
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    throw new Error("Not authenticated")
  }

  const params = await searchParams
  const search = params?.search
  const role = params?.role as "admin" | "user" | undefined
  const status = params?.status as "active" | "banned" | undefined
  const page = params?.page ? parseInt(params.page) : undefined

  try {
    const data = await getUsers({
      search,
      role,
      status,
      page,
      limit: 10,
    })

    if (!data || !data.users) {
      throw new Error("Failed to fetch users data")
    }

    return (
      <div className="flex flex-col gap-4 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage user accounts and permissions.
          </p>
        </div>
        <div className="grid gap-6">
          <UsersTable initialData={data} currentUserId={currentUser.id} />
        </div>
      </div>
    )
  } catch (error) {
    console.error("Error loading users:", error)
    return (
      <div className="flex flex-col gap-4 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-red-500">
            There was an error loading the users data. Please try refreshing the page.
          </p>
        </div>
      </div>
    )
  }
} 