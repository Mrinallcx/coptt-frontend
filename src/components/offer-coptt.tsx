"use client"

// COPTT offer detail. Mirrors the data shown on the dashboard card but
// in a more readable layout, with a Buy CTA at the bottom. The Buy CTA
// is intentionally inert today — the on-chain mint flow lands next.
//
// Design language matches settings-content.tsx (Card, sm buttons, lucide
// icons, neutral Shadcn tones). No new primitives.

import {
  ArrowLeftIcon,
  ShieldCheckIcon,
  CircleDollarSignIcon,
} from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { BuyCopttCard } from "@/components/buy-coptt-card"

// Top-level facts straight from the original dashboard card (which was
// the source of truth for the offer terms). Keep them in lockstep — if
// product changes either side, change both.
const TERMS: { label: string; value: string }[] = [
  { label: "Equity", value: "CHF 5,600,000" },
  { label: "Type of Investment", value: "Equity" },
  { label: "Min. Investment Amount", value: "N/A" },
  { label: "Max. Investment Amount", value: "N/A" },
  { label: "Issue Date", value: "15 October 2025" },
  { label: "Term", value: "12 months" },
]

const HIGHLIGHTS = [
  "1 COPTT = 1 lb of LME Grade A copper, in-ground reserves",
  "Backed by geological certification and a third-party reserve audit",
  "ERC-20 on Ethereum — transparent supply, on-chain audit trail",
  "Optional physical redemption for institutional holders",
  "KYC-gated wallets only — fully regulatory-compliant",
]

export function OfferCoptt() {
  return (
    <div className="space-y-4">
      {/* Page header — back link + title row */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button size="sm" variant="ghost" render={<Link href="/dashboard" />}>
          <ArrowLeftIcon className="size-3.5" />
          Back to dashboard
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary">Commodities</Badge>
                <Badge variant="outline" className="text-xs">
                  Equity
                </Badge>
              </div>
              <CardTitle className="text-xl">COPTT — Tokenized Copper</CardTitle>
              <CardDescription>
                A tokenized forward sale of in-ground copper reserves, giving
                institutional investors discounted, transparent, on-chain
                exposure to future copper production.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Terms — two-column key/value grid */}
          <section className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <CircleDollarSignIcon className="size-3.5" />
              Offer terms
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              {TERMS.map((t) => (
                <div
                  key={t.label}
                  className="flex items-center justify-between border-b border-border/40 py-1.5"
                >
                  <span className="text-muted-foreground">{t.label}</span>
                  <span className="font-medium">{t.value}</span>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          {/* Highlights */}
          <section className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <ShieldCheckIcon className="size-3.5" />
              Highlights
            </h3>
            <ul className="space-y-1.5 text-sm">
              {HIGHLIGHTS.map((h) => (
                <li key={h} className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-1.5 size-1 rounded-full bg-muted-foreground shrink-0" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </section>

          <Separator />

          <p className="text-xs text-muted-foreground">
            Investing requires completed KYC. The mint module below will
            walk you through connecting a wallet and minting on Sepolia.
          </p>
        </CardContent>
      </Card>

      {/* Wallet + mint flow. KYC-gated on both the client and the server. */}
      <BuyCopttCard />
    </div>
  )
}
