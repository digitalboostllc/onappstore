import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UserProfileForm } from "@/components/forms/user-profile-form"
import { PasswordChangeForm } from "@/components/forms/password-change-form"
import { Separator } from "@/components/ui/separator"

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      redirect("/login")
    }

    return (
      <div className="container py-8 space-y-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
            <CardDescription>
              Manage your account profile and security settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">Profile Information</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Update your account profile information.
              </p>
              <UserProfileForm user={user} />
            </div>

            <Separator />
            
            <div>
              <h3 className="text-lg font-medium">Security Settings</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Update your password and manage security settings.
              </p>
              <PasswordChangeForm />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  } catch (error) {
    console.error("[SETTINGS]", error)
    redirect("/login")
  }
} 