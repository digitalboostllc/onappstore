import { Metadata } from "next"
import { CommentsTable } from "@/components/admin/comments-table"

export const metadata: Metadata = {
  title: "Admin - Comments",
  description: "Manage all comments and replies across the platform.",
}

export default async function AdminCommentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Comments Management</h3>
        <p className="text-sm text-muted-foreground">
          Manage all comments and replies across the platform. You can edit, delete, or moderate comments.
        </p>
      </div>
      <CommentsTable />
    </div>
  )
} 