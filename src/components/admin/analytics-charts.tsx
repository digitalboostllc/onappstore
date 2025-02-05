"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { format } from "date-fns"

interface DailyStats {
  date: string
  downloads: number
  users: number
  apps: number
}

interface CategoryDistribution {
  category: string
  count: number
}

interface AnalyticsChartsProps {
  dailyStats: DailyStats[]
  categoryDistribution: CategoryDistribution[]
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

export function AnalyticsCharts({
  dailyStats,
  categoryDistribution,
}: AnalyticsChartsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Daily Activity</CardTitle>
          <CardDescription>
            Downloads, new users, and app submissions over time
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={dailyStats}
              margin={{
                top: 5,
                right: 10,
                left: 10,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => format(new Date(value), "MMM d")}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(value) => format(new Date(value), "MMM d, yyyy")}
              />
              <Line
                type="monotone"
                dataKey="downloads"
                stroke="#0088FE"
                name="Downloads"
              />
              <Line
                type="monotone"
                dataKey="users"
                stroke="#00C49F"
                name="New Users"
              />
              <Line
                type="monotone"
                dataKey="apps"
                stroke="#FFBB28"
                name="New Apps"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>App Categories</CardTitle>
          <CardDescription>Distribution of apps by category</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryDistribution}
                dataKey="count"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={(entry) => entry.category}
              >
                {categoryDistribution.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
} 