"use client"

import { CartesianGrid, Line, LineChart, XAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const investedChartData = [
  { month: "Jan", invested: 120000 },
  { month: "Feb", invested: 132000 },
  { month: "Mar", invested: 145000 },
  { month: "Apr", invested: 158000 },
  { month: "May", invested: 172000 },
  { month: "Jun", invested: 185000 },
]

const currentValueChartData = [
  { month: "Jan", currentValue: 138000 },
  { month: "Feb", currentValue: 152000 },
  { month: "Mar", currentValue: 168000 },
  { month: "Apr", currentValue: 184500 },
  { month: "May", currentValue: 199800 },
  { month: "Jun", currentValue: 211250 },
]

const investedChartConfig = {
  invested: {
    label: "Invested",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

const currentValueChartConfig = {
  currentValue: {
    label: "Current Value",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

const totalReturnsChartData = [
  { month: "Jan", returns: 4200 },
  { month: "Feb", returns: 8600 },
  { month: "Mar", returns: 12200 },
  { month: "Apr", returns: 16750 },
  { month: "May", returns: 21400 },
  { month: "Jun", returns: 26250 },
]

const investmentsChartData = [
  { month: "Jan", active: 1, pending: 0 },
  { month: "Feb", active: 1, pending: 1 },
  { month: "Mar", active: 2, pending: 1 },
  { month: "Apr", active: 2, pending: 2 },
  { month: "May", active: 2, pending: 1 },
  { month: "Jun", active: 2, pending: 1 },
]

const totalReturnsChartConfig = {
  returns: {
    label: "Returns",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

const investmentsChartConfig = {
  active: {
    label: "Active",
    color: "var(--chart-1)",
  },
  pending: {
    label: "Pending",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

export function InvestmentSummaryCards() {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      <Card className="@container/card">
        <CardContent className="pt-6">
          <CardDescription>Total Invested</CardDescription>
          <CardTitle className="mt-2 text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            $185,000
          </CardTitle>
        </CardContent>
        <CardContent className="pt-0">
          <ChartContainer config={investedChartConfig} className="h-20 w-full">
            <LineChart
              accessibilityLayer
              data={investedChartData}
              margin={{ left: 4, right: 4, top: 4, bottom: 0 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value.slice(0, 1)}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel indicator="line" />}
              />
              <Line
                dataKey="invested"
                type="monotone"
                stroke="var(--color-invested)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
      <Card className="@container/card">
        <CardContent className="pt-6">
          <CardDescription>Current Value</CardDescription>
          <CardTitle className="mt-2 text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            $211,250
          </CardTitle>
        </CardContent>
        <CardContent className="pt-0">
          <ChartContainer config={currentValueChartConfig} className="h-20 w-full">
            <LineChart
              accessibilityLayer
              data={currentValueChartData}
              margin={{ left: 4, right: 4, top: 4, bottom: 0 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value.slice(0, 1)}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel indicator="line" />}
              />
              <Line
                dataKey="currentValue"
                type="monotone"
                stroke="var(--color-currentValue)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
      <Card className="@container/card">
        <CardContent className="pt-6 pb-2">
          <CardDescription>Total Returns</CardDescription>
          <CardTitle className="mt-2 text-2xl font-semibold tabular-nums text-emerald-600 @[250px]/card:text-3xl">
            +$26,250
          </CardTitle>
        </CardContent>
        <CardContent className="pt-0">
          <ChartContainer config={totalReturnsChartConfig} className="h-20 w-full">
            <LineChart
              accessibilityLayer
              data={totalReturnsChartData}
              margin={{ left: 4, right: 4, top: 4, bottom: 0 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value.slice(0, 1)}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel indicator="line" />}
              />
              <Line
                dataKey="returns"
                type="monotone"
                stroke="var(--color-returns)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="pt-0">
          <p className="text-sm font-medium text-emerald-600">+14.2% overall</p>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardContent className="pt-6 pb-2">
          <CardDescription>Investments</CardDescription>
          <CardTitle className="mt-2 text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            3
          </CardTitle>
        </CardContent>
        <CardContent className="pt-0">
          <ChartContainer config={investmentsChartConfig} className="h-20 w-full">
            <LineChart
              accessibilityLayer
              data={investmentsChartData}
              margin={{ left: 4, right: 4, top: 4, bottom: 0 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value.slice(0, 1)}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Line
                dataKey="active"
                type="monotone"
                stroke="var(--color-active)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                dataKey="pending"
                type="monotone"
                stroke="var(--color-pending)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="pt-0 text-sm">
          <p className="flex gap-2 text-muted-foreground">
            <span className="text-emerald-600">2 Active</span>
            <span>1 Pending</span>
            <span>0 Done</span>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
