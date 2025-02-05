import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { formatDate } from "@/lib/utils"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from "next/link"

export default async function DownloadsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  const downloads = await prisma.download.findMany({
    where: { userId: user.id },
    include: {
      version: {
        include: {
          app: {
            include: {
              developer: {
                include: {
                  user: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  return (
    <div className="container py-8 space-y-8">
      <PageHeader>
        <PageHeader.Title>Download History</PageHeader.Title>
        <PageHeader.Description>
          Your app download history and activity.
        </PageHeader.Description>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>App</TableHead>
                <TableHead>Developer</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Downloaded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {downloads.map((download) => (
                <TableRow key={download.id}>
                  <TableCell>
                    <Link
                      href={`/apps/${download.version.app.id}`}
                      className="font-medium hover:underline"
                    >
                      {download.version.app.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {download.version.app.developer.user.name}
                  </TableCell>
                  <TableCell>v{download.version.version}</TableCell>
                  <TableCell>{formatDate(download.createdAt)}</TableCell>
                </TableRow>
              ))}
              {downloads.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground h-24"
                  >
                    No downloads yet. Start exploring apps!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
} 