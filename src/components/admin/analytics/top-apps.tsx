"use client"

import Link from "next/link"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts"

interface App {
  id: string
  name: string
  downloads: number
}

interface TopAppsProps {
  apps: App[]
}

export function TopApps({ apps }: TopAppsProps) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={apps}>
          <XAxis
            dataKey="name"
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => `${value}`}
          />
          <Tooltip />
          <Bar dataKey="downloads" fill="#2563eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="space-y-2 mt-4">
        {apps.map((app) => (
          <div key={app.id} className="flex items-center">
            <Link
              href={`/apps/${app.id}`}
              className="flex-1 text-sm hover:underline"
            >
              {app.name}
            </Link>
            <span className="text-sm text-muted-foreground">
              {app.downloads} downloads
            </span>
          </div>
        ))}
      </div>
    </div>
  )
} 