"use client"

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts"

interface Download {
  category: string
  platform: string
}

interface DownloadStatsProps {
  downloads: Download[]
}

const COLORS = ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"]

export function DownloadStats({ downloads }: DownloadStatsProps) {
  // Group downloads by category
  const downloadsByCategory = downloads.reduce((acc: Record<string, number>, download) => {
    acc[download.category] = (acc[download.category] || 0) + 1
    return acc
  }, {})

  // Convert to array format for Recharts
  const categoryData = Object.entries(downloadsByCategory).map(([name, value]) => ({
    name,
    value,
  }))

  // Group downloads by platform
  const downloadsByPlatform = downloads.reduce((acc: Record<string, number>, download) => {
    acc[download.platform] = (acc[download.platform] || 0) + 1
    return acc
  }, {})

  // Convert to array format for Recharts
  const platformData = Object.entries(downloadsByPlatform).map(([name, value]) => ({
    name,
    value,
  }))

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <h3 className="text-lg font-medium mb-4">Downloads by Category</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={categoryData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              fill="#2563eb"
              label={(entry) => entry.name}
            >
              {categoryData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div>
        <h3 className="text-lg font-medium mb-4">Downloads by Platform</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={platformData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              fill="#2563eb"
              label={(entry) => entry.name}
            >
              {platformData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
} 