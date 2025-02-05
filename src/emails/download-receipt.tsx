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

interface DownloadReceiptEmailProps {
  name: string
  appName: string
  appVersion: string
  downloadUrl: string
  appUrl: string
}

export default function DownloadReceiptEmail({
  name,
  appName,
  appVersion,
  downloadUrl,
  appUrl,
}: DownloadReceiptEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your Download Receipt for {appName}</Preview>
      <Tailwind>
        <Body className="bg-white font-sans">
          <Container className="mx-auto py-8 px-4">
            <Heading className="text-2xl font-bold text-gray-900 mb-4">
              Download Receipt
            </Heading>
            <Text className="text-gray-700 mb-4">
              Hi {name},
            </Text>
            <Text className="text-gray-700 mb-4">
              Thank you for downloading {appName}! Here's your download receipt and important information:
            </Text>
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <Text className="text-gray-700 mb-2">
                <strong>App:</strong> {appName}
              </Text>
              <Text className="text-gray-700 mb-2">
                <strong>Version:</strong> {appVersion}
              </Text>
              <Text className="text-gray-700">
                <strong>Download Date:</strong> {new Date().toLocaleDateString()}
              </Text>
            </div>
            <Link
              href={downloadUrl}
              className="inline-block bg-blue-600 text-white py-3 px-6 rounded-lg font-medium mb-4"
            >
              Download Again
            </Link>
            <Text className="text-gray-700 mb-4">
              You can also view more details about the app and leave a review:
            </Text>
            <Link
              href={appUrl}
              className="inline-block bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium"
            >
              View App Details
            </Link>
            <Text className="text-gray-600 text-sm mt-8">
              If you have any issues with the download or questions about the app, feel free to reply to this email.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
} 