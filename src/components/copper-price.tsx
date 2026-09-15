"use client"

// Live copper price card for /dashboard.
//
// Reads GET /coptt/price (public endpoint). Auto-refreshes every 60s
// while the tab is visible — matches the backend cache TTL, so the
// network call is cheap. The "source" badge tells you whether the price
// is real (pyth_lazer) or the dev fallback (mock).

import { useCallback, useEffect, useState } from "react"
import { AlertCircleIcon, ActivityIcon, Loader2Icon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { copttApi, type CopperPrice } from "@/lib/api"

const POLL_MS = 60_000

export function CopperPriceCard() {
  const [price, setPrice] = useState<CopperPrice | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchPrice = useCallback(async () => {
    try {
      const p = await copttApi.getPrice()
      setPrice(p)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load price")
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load + poll on focus / visibility.
  useEffect(() => {
    fetchPrice()
    if (typeof document === "undefined") return
    const id = setInterval(() => {
      if (document.visibilityState === "visible") fetchPrice()
    }, POLL_MS)
    return () => clearInterval(id)
  }, [fetchPrice])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Copper price
            </CardTitle>
            <CardDescription className="text-xs">
              {price?.feed_symbol ?? "PYTH COPPER 24/7"} · per pound
            </CardDescription>
          </div>
          {price && <SourceBadge source={price.source} stale={price.stale} />}
        </div>
      </CardHeader>
      <CardContent>
        {loading && !price ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 text-sm text-destructive">
            <AlertCircleIcon className="size-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : price ? (
          <div className="space-y-1">
            <div className="text-3xl font-semibold tabular-nums">
              ${price.usd_per_lb.toFixed(4)}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ActivityIcon className="size-3" />
              <span>
                Updated {formatRelative(price.publish_time)}
                {price.confidence && price.confidence > 0
                  ? ` · ± $${price.confidence.toFixed(4)}`
                  : ""}
              </span>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function SourceBadge({
  source,
  stale,
}: {
  source: CopperPrice["source"]
  stale?: boolean
}) {
  if (stale) {
    return (
      <Badge variant="outline" className="text-amber-600 dark:text-amber-400">
        Stale
      </Badge>
    )
  }
  if (source === "pyth_lazer") {
    return (
      <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400">
        Live · Pyth
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Mock
    </Badge>
  )
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return "just now"
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (diffSec < 60) return `${diffSec}s ago`
  const min = Math.floor(diffSec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  return `${day}d ago`
}
