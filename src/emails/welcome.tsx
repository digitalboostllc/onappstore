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

interface WelcomeEmailProps {
  name: string
  loginUrl: string
}

export default function WelcomeEmail({ name, loginUrl }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to App Display - Your App Showcase Platform</Preview>
      <Tailwind>
        <Body className="bg-white font-sans">
          <Container className="mx-auto py-8 px-4">
            <Heading className="text-2xl font-bold text-gray-900 mb-4">
              Welcome to App Display, {name}!
            </Heading>
            <Text className="text-gray-700 mb-4">
              Thank you for joining App Display. We're excited to have you on board!
              Our platform makes it easy to showcase and discover amazing applications.
            </Text>
            <Text className="text-gray-700 mb-4">
              You can now:
              <ul className="list-disc pl-6 mt-2">
                <li>Submit your applications</li>
                <li>Browse and download other apps</li>
                <li>Connect with other developers</li>
              </ul>
            </Text>
            <Link
              href={loginUrl}
              className="inline-block bg-blue-600 text-white py-3 px-6 rounded-lg font-medium"
            >
              Get Started
            </Link>
            <Text className="text-gray-600 text-sm mt-8">
              If you have any questions, feel free to reply to this email. We're here to help!
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
} 