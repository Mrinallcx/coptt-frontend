"use client"

// Copper price chart, shown on /dashboard and the COPTT offer page.
//
// Reads GET /coptt/price/history (public). The upstream feed only ever
// publishes the current price, so the series is what the backend has
// sampled since it was deployed — a young deployment legitimately has
// little or nothing to draw, which is why the empty state explains
// itself instead of looking like a failure.

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import {
  AlertCircleIcon,
  Loader2Icon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  ApiRequestError,
  copttApi,
  type CopperPriceHistory,
  type CopperPriceRange,
} from "@/lib/api"

const RANGES: Array<{ value: CopperPriceRange; label: string }> = [
  { value: "24h", label: "24H" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "1y", label: "1Y" },
]

const POLL_MS = 60_000

const chartConfig = {
  usd_per_lb: {
    label: "Copper",
    color: "#d97706",
  },
} satisfies ChartConfig

export function CopperPriceChart({
  defaultRange = "7d",
  className,
}: {
  defaultRange?: CopperPriceRange
  className?: string
}) {
  const [range, setRange] = useState<CopperPriceRange>(defaultRange)
  const [history, setHistory] = useState<CopperPriceHistory | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchHistory = useCallback(async (r: CopperPriceRange) => {
    try {
      const h = await copttApi.getPriceHistory(r)
      setHistory(h)
      setError(null)
    } catch (err) {
      // 503 means this deployment isn't recording prices at all, which
      // is a different message from a transient network failure.
      if (err instanceof ApiRequestError && err.error === "history_unavailable") {
        setError("Price history isn't available on this environment yet.")
      } else {
        setError(err instanceof Error ? err.message : "Couldn't load price history")
      }
      setHistory(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchHistory(range)
  }, [fetchHistory, range])

  useEffect(() => {
    if (typeof document === "undefined") return
    const id = setInterval(() => {
      if (document.visibilityState === "visible") fetchHistory(range)
    }, POLL_MS)
    return () => clearInterval(id)
  }, [fetchHistory, range])

  const points = history?.points ?? []

  const chartData = useMemo(
    () =>
      points.map((p) => ({
        t: p.t,
        label: formatTick(p.t, range),
        usd_per_lb: p.usd_per_lb,
      })),
    [points, range],
  )

  // Y axis padded to the series rather than anchored at zero: copper
  // moves in cents, so a zero-based axis would render a flat line.
  const domain = useMemo<[number, number] | undefined>(() => {
    if (points.length === 0) return undefined
    const values = points.map((p) => p.usd_per_lb)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const pad = Math.max((max - min) * 0.15, 0.01)
    return [Math.max(0, min - pad), max + pad]
  }, [points])

  const change = useMemo(() => {
    if (points.length < 2) return null
    const first = points[0].usd_per_lb
    const last = points[points.length - 1].usd_per_lb
    if (first <= 0) return null
    return { abs: last - first, pct: ((last - first) / first) * 100 }
  }, [points])

  const isMockSeries =
    (history?.sources?.length ?? 0) > 0 &&
    history!.sources!.every((s) => s === "mock")

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Copper price history
              </CardTitle>
              {isMockSeries && (
                <Badge variant="outline" className="text-muted-foreground">
                  Sample data
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              USD per pound · {rangeLabel(range)}
            </CardDescription>
          </div>

          <div className="flex items-center gap-3">
            {change && (
              <div
                className={
                  change.abs >= 0
                    ? "flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400"
                    : "flex items-center gap-1 text-sm font-medium text-destructive"
                }
              >
                {change.abs >= 0 ? (
                  <TrendingUpIcon className="size-4" />
                ) : (
                  <TrendingDownIcon className="size-4" />
                )}
                <span className="tabular-nums">
                  {change.abs >= 0 ? "+" : ""}
                  {change.pct.toFixed(2)}%
                </span>
              </div>
            )}
            <div className="flex gap-1">
              {RANGES.map((r) => (
                <Button
                  key={r.value}
                  type="button"
                  size="sm"
                  variant={r.value === range ? "secondary" : "ghost"}
                  className="h-7 px-2 text-xs"
                  onClick={() => setRange(r.value)}
                >
                  {r.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading && !history ? (
          <div className="flex h-56 items-center justify-center gap-2 text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : error ? (
          <div className="flex h-56 items-start gap-2 text-sm text-destructive">
            <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : chartData.length < 2 ? (
          <EmptySeries range={range} />
        ) : (
          <ChartContainer config={chartConfig} className="h-56 w-full">
            <AreaChart
              accessibilityLayer
              data={chartData}
              margin={{ left: 4, right: 8, top: 8, bottom: 0 }}
            >
              <defs>
                <linearGradient id="copperFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
              />
              <YAxis
                dataKey="usd_per_lb"
                domain={domain}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={56}
                tickFormatter={(v: number) => `$${v.toFixed(2)}`}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelKey="label"
                    formatter={(value) => `$${Number(value).toFixed(4)} / lb`}
                  />
                }
              />
              <Area
                dataKey="usd_per_lb"
                type="monotone"
                stroke="var(--color-usd_per_lb)"
                strokeWidth={2}
                fill="url(#copperFill)"
                dot={false}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

// Distinguishes "nothing recorded yet" from "nothing in this window",
// because the fix is different: wait, or pick a shorter range.
function EmptySeries({ range }: { range: CopperPriceRange }) {
  return (
    <div className="flex h-56 flex-col items-center justify-center gap-1 text-center">
      <p className="text-sm font-medium">Not enough price history yet</p>
      <p className="max-w-md text-xs text-muted-foreground">
        The market feed publishes only the current price, so this chart
        builds up from readings taken every few minutes. Check back over
        the next few hours{range === "24h" ? "" : ", or try a shorter range"}.
      </p>
    </div>
  )
}

function rangeLabel(range: CopperPriceRange): string {
  switch (range) {
    case "24h":
      return "last 24 hours"
    case "7d":
      return "last 7 days"
    case "30d":
      return "last 30 days"
    case "90d":
      return "last 90 days"
    case "1y":
      return "last 12 months"
  }
}

function formatTick(iso: string, range: CopperPriceRange): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  if (range === "24h") {
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    })
  }
  if (range === "1y") {
    return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" })
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}
