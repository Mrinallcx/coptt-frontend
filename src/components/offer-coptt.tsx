"use client"

// COPTT offer detail. Information hierarchy mirrors the dashboard card:
// title → description → offer terms → highlights → KYC note → buy flow.

import type { ReactNode } from "react"
import { CheckIcon, DownloadIcon, FileTextIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { BuyCopttCard } from "@/components/buy-coptt-card"
import { InvestCheckout } from "@/components/invest-checkout"

const TERMS: { label: string; value: string; highlight?: boolean }[] = [
  { label: "Equity", value: "CHF 5,600,000", highlight: true },
  { label: "Type of Investment", value: "Equity" },
  { label: "Min. Investment Amount", value: "N/A" },
  { label: "Max. Investment Amount", value: "N/A" },
  { label: "Issue Date", value: "15 October 2025", highlight: true },
  { label: "Term", value: "12 months", highlight: true },
]

const HIGHLIGHTS = [
  "1 COPTT = 1 lb of LME Grade A copper, in-ground reserves",
  "Backed by geological certification and a third-party reserve audit",
  "ERC-20 on Ethereum — transparent supply, on-chain audit trail",
  "Optional physical redemption for institutional holders",
  "KYC-gated wallets only — fully regulatory-compliant",
]

const FUNDING = {
  target: 5_600_000,
  raised: 4_312_000,
  investors: 134,
  daysLeft: 15,
  currency: "CHF",
}

const OFFER_RISKS = [
  {
    title: "Capital at risk",
    body: "COPTT is linked to the copper price, which can fall as well as rise. You may get back less than you invest, and you should be prepared to lose the entire amount.",
  },
  {
    title: "No advice or offer",
    body: "Nothing here is investment, legal, or tax advice, or an offer or solicitation in any jurisdiction where that would be unlawful.",
  },
  {
    title: "Eligibility and KYC",
    body: "Access requires identity verification and AML checks. Eligibility may be restricted by residence and investor classification.",
  },
  {
    title: "Digital-asset risks",
    body: "Tokens carry extra risks: wallet-key loss or theft, smart-contract defects, network failure, and limited or no secondary-market liquidity.",
  },
  {
    title: "Indicative information",
    body: "Prices, charts, and valuations are indicative only. Past performance is not a reliable indicator of future results.",
  },
  {
    title: "No guaranteed return",
    body: "Toto Finance does not guarantee any return, redemption value, or the ability to sell or transfer tokens at a particular price or time.",
  },
]

const DOCUMENTS = [
  { title: "COPTT Offering Memorandum", filename: "COPTT-Offering-Memorandum.txt" },
  { title: "Risk Factors", filename: "COPTT-Risk-Factors.txt" },
  { title: "Subscription Agreement", filename: "COPTT-Subscription-Agreement.txt" },
  { title: "Reserve Audit Summary", filename: "COPTT-Reserve-Audit-Summary.txt" },
]

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

function downloadDocument(title: string, filename: string) {
  const blob = new Blob(
    [`${title}\n\nPlaceholder document for local review. Replace with the signed PDF.`],
    { type: "text/plain" },
  )
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function FundingProgress() {
  const percent = Math.round((FUNDING.raised / FUNDING.target) * 1000) / 10

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold tabular-nums text-foreground">
            {formatMoney(FUNDING.raised, FUNDING.currency)}
          </span>{" "}
          raised
        </p>
        <p className="text-sm font-semibold tabular-nums">{percent.toFixed(0)}%</p>
      </div>

      <div
        className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Funding progress"
      >
        <div
          className="h-full rounded-full bg-[#D4A017]"
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Target {formatMoney(FUNDING.target, FUNDING.currency)}
        <span className="mx-2 text-border">·</span>
        {FUNDING.investors} investors
        <span className="mx-2 text-border">·</span>
        {FUNDING.daysLeft} days left
      </p>
    </div>
  )
}

function RiskDisclosure() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Read these before you subscribe. They do not replace the full offering documents.
      </p>
      <ol className="divide-y rounded-lg border">
        {OFFER_RISKS.map((risk, index) => (
          <li key={risk.title} className="grid grid-cols-[2rem_1fr] gap-3 px-4 py-3">
            <span className="pt-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{risk.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{risk.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

function OfferDocuments() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Documents</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Download the offering materials for this raise.
        </p>
      </div>
      <ul className="divide-y rounded-lg border">
        {DOCUMENTS.map((doc) => (
          <li
            key={doc.filename}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-[#9A5B2E] dark:bg-amber-950/40 dark:text-amber-400">
                <FileTextIcon className="size-4" />
              </span>
              <p className="truncate text-sm font-medium">{doc.title}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => downloadDocument(doc.title, doc.filename)}
            >
              <DownloadIcon />
              Download
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}

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

      <Tabs defaultValue="funding" className={cn("gap-3 px-6 pb-6 pt-3", panel)}>
        <TabsList>
          <TabsTrigger value="funding">Funding progress</TabsTrigger>
          <TabsTrigger value="risk">Risk disclosure</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>
        <TabsContent value="funding">
          <FundingProgress />
        </TabsContent>
        <TabsContent value="risk">
          <RiskDisclosure />
        </TabsContent>
        <TabsContent value="documents">
          <OfferDocuments />
        </TabsContent>
      </Tabs>

      <Section title="Offer terms">
        <dl className={cn("grid grid-cols-2 gap-px overflow-hidden sm:grid-cols-3", panel)}>
          {TERMS.map((term) => (
            <div
              key={term.label}
              className={cn(
                "px-4 py-4",
                term.highlight
                  ? "bg-gradient-to-br from-amber-50/95 via-orange-50/40 to-amber-50/20 ring-1 ring-inset ring-amber-200/70 dark:from-amber-950/45 dark:via-orange-950/20 dark:to-amber-950/10 dark:ring-amber-800/40"
                  : "bg-card",
              )}
            >
              <dt
                className={cn(
                  "text-[11px] font-medium uppercase tracking-wide",
                  term.highlight
                    ? "text-[#9A5B2E]/80 dark:text-amber-400/80"
                    : "text-muted-foreground",
                )}
              >
                {term.label}
              </dt>
              <dd
                className={cn(
                  "mt-1.5 text-sm font-semibold tabular-nums",
                  term.highlight && "text-[#8B4513] dark:text-amber-300",
                )}
              >
                {term.value}
              </dd>
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

      <InvestCheckout />
    </div>
  )
}
