import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from "@react-email/components"
import { Tailwind } from "@react-email/tailwind"

interface AppStatusEmailProps {
  name: string
  appName: string
  status: "approved" | "rejected" | "pending"
  message?: string
  appUrl?: string
}

export default function AppStatusEmail({
  name,
  appName,
  status,
  message,
  appUrl,
}: AppStatusEmailProps) {
  const statusMessages = {
    approved: {
      title: "Your App Has Been Approved! 🎉",
      description: "Congratulations! Your app has been approved and is now live on App Display.",
      action: "View Your App",
    },
    rejected: {
      title: "App Submission Update",
      description: "We regret to inform you that your app submission has been rejected.",
      action: "Submit Again",
    },
    pending: {
      title: "App Submission Received",
      description: "We've received your app submission and it's currently under review.",
      action: "Check Status",
    },
  }

  const currentStatus = statusMessages[status]

  return (
    <Html>
      <Head />
      <Preview>{currentStatus.title}</Preview>
      <Tailwind>
        <Body className="bg-white font-sans">
          <Container className="mx-auto py-8 px-4">
            <Heading className="text-2xl font-bold text-gray-900 mb-4">
              Hi {name},
            </Heading>
            <Heading className="text-xl font-semibold text-gray-900 mb-4">
              {currentStatus.title}
            </Heading>
            <Text className="text-gray-700 mb-4">
              {currentStatus.description}
            </Text>
            <Text className="text-gray-700 mb-4">
              App Name: <strong>{appName}</strong>
            </Text>
            {message && (
              <Text className="text-gray-700 mb-4 p-4 bg-gray-50 rounded-lg">
                {message}
              </Text>
            )}
            {appUrl && (
              <Link
                href={appUrl}
                className="inline-block bg-blue-600 text-white py-3 px-6 rounded-lg font-medium"
              >
                {currentStatus.action}
              </Link>
            )}
            <Text className="text-gray-600 text-sm mt-8">
              If you have any questions, feel free to reply to this email. We're here to help!
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
} 