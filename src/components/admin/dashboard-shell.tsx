import { ReactNode } from "react"

interface DashboardShellProps {
  children: ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="flex flex-col gap-6 p-6">
      {children}
    </div>
  )
} 
