"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { TrendingUpIcon, TrendingDownIcon, MinusIcon } from "lucide-react"

type TokenDetail = { label: string; value: string }

type ChartPoint = { date: string; value: number }

type Position = {
  title: string
  category: string
  status: "Active" | "Pending" | "Done"
  chartData: ChartPoint[]
  chartColor: string
  chartGradientFrom: string
  entryValue: number
  invested: string
  currentValue: string
  performancePct: number
  performanceLabel: string
  details: TokenDetail[]
  investedOn: string
}

const positions: Position[] = [
  {
    title: "COPTT — Tokenized Copper",
    category: "Commodities",
    status: "Active",
    chartData: [
      { date: "Nov '25", value: 75000 },
      { date: "Nov '25", value: 74300 },
      { date: "Dec '25", value: 76800 },
      { date: "Dec '25", value: 78900 },
      { date: "Jan '26", value: 77400 },
      { date: "Jan '26", value: 80100 },
      { date: "Feb '26", value: 82600 },
      { date: "Feb '26", value: 84200 },
      { date: "Mar '26", value: 83500 },
      { date: "Mar '26", value: 85400 },
      { date: "Apr '26", value: 86250 },
    ],
    chartColor: "#d97706",
    chartGradientFrom: "#fbbf24",
    entryValue: 75000,
    invested: "$75,000",
    currentValue: "$86,250",
    performancePct: 15,
    performanceLabel: "+15%",
    details: [
      { label: "Tokens Held", value: "16,741" },
      { label: "Entry Price", value: "$4.48/token" },
      { label: "Current Price", value: "$5.15/token" },
      { label: "Current Spot", value: "$5.60/lb (LME)" },
      { label: "Discount at Purchase", value: "20%" },
      { label: "Interest Accrued", value: "2% p.a." },
      { label: "Redemption Start", value: "2030" },
      { label: "Unrealised P&L", value: "+$11,250" },
    ],
    investedOn: "15/11/2025",
  },
  {
    title: "TINTT — Tokenized Tin",
    category: "Commodities",
    status: "Active",
    chartData: [
      { date: "Feb '26", value: 25000 },
      { date: "Feb '26", value: 24600 },
      { date: "Mar '26", value: 25800 },
      { date: "Mar '26", value: 26900 },
      { date: "Apr '26", value: 27500 },
      { date: "Apr '26", value: 26800 },
      { date: "May '26", value: 28300 },
      { date: "May '26", value: 29100 },
      { date: "Jun '26", value: 28700 },
      { date: "Jun '26", value: 29500 },
      { date: "Jul '26", value: 29800 },
    ],
    chartColor: "#0891b2",
    chartGradientFrom: "#22d3ee",
    entryValue: 25000,
    invested: "$25,000",
    currentValue: "$29,800",
    performancePct: 19.2,
    performanceLabel: "+19.2%",
    details: [
      { label: "Tokens Held", value: "10,000" },
      { label: "Entry Price", value: "$2.50/token" },
      { label: "Current Price", value: "$2.98/token" },
      { label: "Current Spot (LME)", value: "$32,400/mt" },
      { label: "Discount at Purchase", value: "15%" },
      { label: "Interest Accrued", value: "1.5% p.a." },
      { label: "Redemption Start", value: "2029" },
      { label: "Unrealised P&L", value: "+$4,800" },
    ],
    investedOn: "01/02/2026",
  },
  {
    title: "PANTT — Tokenized Solar Energy",
    category: "Green Energy",
    status: "Pending",
    chartData: [
      { date: "Jan '26", value: 50000 },
      { date: "Feb '26", value: 50000 },
      { date: "Mar '26", value: 50000 },
      { date: "Apr '26", value: 50000 },
      { date: "May '26", value: 50000 },
      { date: "Jun '26", value: 50000 },
    ],
    chartColor: "#16a34a",
    chartGradientFrom: "#4ade80",
    entryValue: 50000,
    invested: "$50,000",
    currentValue: "$50,000",
    performancePct: 0,
    performanceLabel: "0%",
    details: [
      { label: "Tokens Held", value: "20,000" },
      { label: "Entry Price", value: "$2.50/token" },
      { label: "Current Price", value: "$2.50/token" },
      { label: "Revenue Share", value: "8% p.a." },
      { label: "PPA Term", value: "25 years" },
      { label: "Interest Accrued", value: "0% (pending)" },
      { label: "Redemption Start", value: "2028" },
      { label: "Unrealised P&L", value: "$0" },
    ],
    investedOn: "15/01/2026",
  },
]

const statusStyles: Record<Position["status"], string> = {
  Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Done: "bg-muted text-muted-foreground border-border",
}

function formatUSD(value: number) {
  return `$${value.toLocaleString("en-US")}`
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-xs">
      <p className="text-muted-foreground mb-0.5">{label}</p>
      <p className="font-semibold">{formatUSD(payload[0].value)}</p>
    </div>
  )
}

function PositionCard({ position }: { position: Position }) {
  const gradId = `grad-${position.title.replace(/\s/g, "-")}`
  const yMin = Math.min(...position.chartData.map((d) => d.value)) * 0.97
  const yMax = Math.max(...position.chartData.map((d) => d.value)) * 1.03

  const TrendIcon =
    position.performancePct > 0
      ? TrendingUpIcon
      : position.performancePct < 0
        ? TrendingDownIcon
        : MinusIcon

  const trendColor =
    position.performancePct > 0
      ? "text-emerald-600"
      : position.performancePct < 0
        ? "text-red-500"
        : "text-muted-foreground"

  const barColor =
    position.performancePct > 0
      ? "bg-emerald-500"
      : position.performancePct < 0
        ? "bg-red-500"
        : "bg-muted-foreground"

  const xKeys = Array.from(
    new Set(position.chartData.map((d) => d.date))
  )
  const xTicks = xKeys.filter((_, i) => i % 2 === 0)

  return (
    <Card className="overflow-hidden">
      {/* ── Header ── */}
      <CardContent className="pt-6 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold leading-snug">{position.title}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{position.category}</p>
          </div>
          <Badge
            variant="outline"
            className={`shrink-0 gap-1.5 text-xs font-medium ${statusStyles[position.status]}`}
          >
            <span className="size-1.5 rounded-full bg-current" />
            {position.status}
          </Badge>
        </div>
      </CardContent>

      {/* ── Chart ── */}
      <CardContent className="px-4 pb-4 pt-0">
        <div className="rounded-xl border bg-muted/30 px-3 pt-3 pb-1">
          <div className="mb-1 flex items-center justify-between px-1">
            <span className="text-xs font-medium text-muted-foreground">
              Performance Over Time
            </span>
            <span className={`flex items-center gap-1 text-xs font-semibold ${trendColor}`}>
              <TrendIcon className="size-3" />
              {position.performanceLabel}
            </span>
          </div>

          <ResponsiveContainer width="100%" height={160}>
            <AreaChart
              data={position.chartData}
              margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
            >
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={position.chartGradientFrom} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={position.chartGradientFrom} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                stroke="hsl(var(--border) / 0.6)"
              />
              <XAxis
                dataKey="date"
                ticks={xTicks}
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                domain={[yMin, yMax]}
                tickLine={false}
                axisLine={false}
                width={52}
                tickMargin={4}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <ReferenceLine
                y={position.entryValue}
                stroke={position.chartColor}
                strokeDasharray="4 3"
                strokeOpacity={0.45}
                label={{
                  value: "Entry",
                  position: "insideTopRight",
                  fontSize: 9,
                  fill: position.chartColor,
                  opacity: 0.7,
                }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: position.chartColor, strokeWidth: 1, strokeDasharray: "4 3" }} />
              <Area
                dataKey="value"
                type="monotoneX"
                stroke={position.chartColor}
                strokeWidth={2.5}
                fill={`url(#${gradId})`}
                dot={false}
                activeDot={{ r: 5, fill: position.chartColor, strokeWidth: 2, stroke: "#fff" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>

      {/* ── Invested / Current Value ── */}
      <CardContent className="px-6 pb-3 pt-0">
        <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/20 px-4 py-3">
          <div>
            <p className="text-xs text-muted-foreground">Invested</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">{position.invested}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Current Value</p>
            <p className={`mt-0.5 text-lg font-bold tabular-nums ${trendColor}`}>
              {position.currentValue}
            </p>
          </div>
        </div>
      </CardContent>

      {/* ── Performance bar ── */}
      <CardContent className="px-6 pb-4 pt-0">
        <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
          <span className="text-muted-foreground uppercase tracking-wide">Performance</span>
          <span className={trendColor}>{position.performanceLabel}</span>
        </div>
        <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${Math.min(Math.abs(position.performancePct) * 3, 100)}%` }}
          />
        </div>
      </CardContent>

      {/* ── Token detail grid ── */}
      <CardContent className="px-6 pb-4 pt-0">
        <div className="rounded-xl border bg-muted/20 px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-3">
          {position.details.map((d, i) =>
            d.label ? (
              <div key={i}>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {d.label}
                </p>
                <p className="mt-0.5 text-sm font-semibold">{d.value}</p>
              </div>
            ) : (
              <div key={i} />
            )
          )}
        </div>
      </CardContent>

      {/* ── Footer ── */}
      <CardFooter className="border-t px-6 py-3 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Invested on {position.investedOn}</span>
        <a
          href="#"
          className="font-semibold text-primary hover:opacity-80 hover:underline transition-opacity"
        >
          View Deal →
        </a>
      </CardFooter>
    </Card>
  )
}

export function InvestmentPositions() {
  return (
    <div className="px-4 lg:px-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">My Investments</h2>
        <span className="text-xs text-muted-foreground">{positions.length} positions</span>
      </div>
      <div className="grid grid-cols-1 gap-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
        {positions.map((p) => (
          <PositionCard key={p.title} position={p} />
        ))}
      </div>
    </div>
  )
}
