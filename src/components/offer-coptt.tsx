"use client"

// COPTT offer detail. Information hierarchy mirrors the dashboard card:
// title → description → offer terms → highlights → KYC note → buy flow.

import type { ReactNode } from "react"
import { ArrowLeftIcon, CheckIcon } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { BuyCopttCard } from "@/components/buy-coptt-card"

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

function Section({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  )
}

const panel =
  "rounded-xl border border-border/80 bg-card shadow-sm"

export function OfferCoptt() {
  return (
    <div className="w-full space-y-8 pb-2">
      <Button
        size="sm"
        variant="ghost"
        className="-ml-2 h-8 text-muted-foreground"
        nativeButton={false}
        render={<Link href="/dashboard" />}
      >
        <ArrowLeftIcon className="size-3.5" />
        Back to dashboard
      </Button>

      <header className={cn("overflow-hidden", panel)}>
        <div
          className="h-1 bg-gradient-to-r from-[#8B4513] via-[#B87333] to-[#D4956A]"
          aria-hidden
        />
        <div className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9A5B2E]">
                Commodities
              </span>
              <Badge variant="outline">Equity</Badge>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Live
            </span>
          </div>

          <h1 className="mt-4 font-heading text-3xl font-semibold tracking-tight">
            COPTT
          </h1>
          <p className="mt-1 text-muted-foreground">Tokenized Copper</p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            A tokenized forward sale of in-ground copper reserves, giving institutional
            investors discounted, transparent, on-chain exposure to future copper production.
          </p>
        </div>
      </header>

      <Section title="Offer terms">
        <dl className={cn("grid grid-cols-2 gap-px overflow-hidden sm:grid-cols-3", panel)}>
          {TERMS.map((term) => (
            <div key={term.label} className="bg-card px-4 py-4">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {term.label}
              </dt>
              <dd className="mt-1.5 text-sm font-semibold tabular-nums">{term.value}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Highlights">
        <ul className={cn("divide-y px-1", panel)}>
          {HIGHLIGHTS.map((highlight) => (
            <li
              key={highlight}
              className="flex gap-3 px-4 py-3.5 text-sm leading-relaxed text-foreground/90"
            >
              <CheckIcon className="mt-0.5 size-4 shrink-0 text-[#B87333]" aria-hidden />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>
      </Section>

      <p className={cn("px-4 py-3 text-xs leading-relaxed text-muted-foreground", panel)}>
        Investing requires completed KYC. The mint module below will walk you through
        connecting a wallet and minting on Sepolia.
      </p>

      <BuyCopttCard />
    </div>
  )
}
