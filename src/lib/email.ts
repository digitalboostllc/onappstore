import { Resend } from "resend"
import WelcomeEmail from "@/emails/welcome"
import AppStatusEmail from "@/emails/app-status"
import DownloadReceiptEmail from "@/emails/download-receipt"

if (!process.env.RESEND_API_KEY) {
  throw new Error("Missing RESEND_API_KEY environment variable")
}

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendWelcomeEmail(email: string, name: string) {
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login`

  await resend.emails.send({
    from: "App Display <noreply@appdisplay.com>",
    to: email,
    subject: "Welcome to App Display!",
    react: WelcomeEmail({ name, loginUrl }),
  })
}

export async function sendAppStatusEmail(
  email: string,
  name: string,
  appName: string,
  status: "approved" | "rejected" | "pending",
  message?: string
) {
  const appUrl = status === "approved"
    ? `${process.env.NEXT_PUBLIC_APP_URL}/apps/${appName}`
    : undefined

  await resend.emails.send({
    from: "App Display <noreply@appdisplay.com>",
    to: email,
    subject: `App Status Update: ${appName}`,
    react: AppStatusEmail({ name, appName, status, message, appUrl }),
  })
}

export async function sendDownloadReceiptEmail(
  email: string,
  name: string,
  appName: string,
  appVersion: string,
  downloadUrl: string,
  appUrl: string
) {
  await resend.emails.send({
    from: "App Display <noreply@appdisplay.com>",
    to: email,
    subject: `Download Receipt: ${appName}`,
    react: DownloadReceiptEmail({
      name,
      appName,
      appVersion,
      downloadUrl,
      appUrl,
    }),
  })
} 