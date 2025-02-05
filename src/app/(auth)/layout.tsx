import { ModeToggle } from "@/components/mode-toggle"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <div className="absolute right-4 top-4">
        <ModeToggle />
      </div>
      {children}
    </>
  )
} 