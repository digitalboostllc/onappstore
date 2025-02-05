"use client"

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts"

interface User {
  date: string
  total: number
}

interface UserStatsProps {
  users: User[]
}

export function UserStats({ users }: UserStatsProps) {
  // Calculate growth rate
  const firstTotal = users[0]?.total || 0
  const lastTotal = users[users.length - 1]?.total || 0
  const growthRate = firstTotal === 0 ? 0 : ((lastTotal - firstTotal) / firstTotal) * 100

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Total Users</div>
          <div className="text-2xl font-bold">{lastTotal}</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Growth Rate</div>
          <div className="text-2xl font-bold">
            {growthRate.toFixed(1)}%
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={users}>
          <XAxis
            dataKey="date"
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
          <Area
            type="monotone"
            dataKey="total"
            stroke="#2563eb"
            fill="#2563eb"
            fillOpacity={0.2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
} 