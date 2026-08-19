"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRightIcon, LockIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CopperPriceCard } from "@/components/copper-price"
import { cn } from "@/lib/utils"

type OfferAccent = "copper" | "tin" | "solar" | "estate"

type OfferCard = {
  ticker: string
  subtitle: string
  category: string
  description: string
  href?: string
  accent: OfferAccent
  equity: string
  term: string
  minInvestment: string
  issueDate: string
  comingSoon?: boolean
}

const liveCopperCard = {
  shell:
    "border-amber-200/90 bg-gradient-to-b from-amber-50/90 via-orange-50/35 to-card hover:border-amber-300/90 hover:shadow-md hover:shadow-amber-500/10 dark:border-amber-900/50 dark:from-amber-950/35 dark:via-orange-950/20 dark:to-card dark:hover:border-amber-800/60",
  bar: "from-[#8B4513] via-[#B87333] to-[#D4956A]",
  glow: "bg-gradient-to-br from-amber-500/10 via-orange-400/5 to-transparent",
  label: "text-[#9A5B2E] dark:text-amber-400/90",
  title: "text-foreground",
  subtitle: "text-amber-950/55 dark:text-amber-100/50",
  stat: "text-foreground",
  divider: "border-amber-200/70 dark:border-amber-900/40",
}

const inactiveCard = {
  shell:
    "border-zinc-200/90 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-900/35",
  bar: "from-zinc-300 via-zinc-200 to-zinc-300 dark:from-zinc-700 dark:via-zinc-600 dark:to-zinc-700",
  glow: "bg-zinc-400/5",
  label: "text-zinc-400 dark:text-zinc-500",
  title: "text-zinc-500 dark:text-zinc-400",
  subtitle: "text-zinc-400 dark:text-zinc-500",
  stat: "text-zinc-500 dark:text-zinc-400",
  divider: "border-zinc-200/80 dark:border-zinc-800",
}

function ExpandableDescription({
  text,
  inactive,
}: {
  text: string
  inactive?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [truncated, setTruncated] = useState(false)
  const textRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const el = textRef.current
    if (!el || expanded) return

    const measure = () => {
      setTruncated(el.scrollHeight > el.clientHeight + 1)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [text, expanded])

  const showToggle = expanded || truncated

  return (
    <div className="mt-4">
      <p
        ref={textRef}
        className={cn(
          "text-sm leading-relaxed",
          inactive ? "text-zinc-400 dark:text-zinc-500" : "text-muted-foreground",
          !expanded && "line-clamp-2",
        )}
      >
        {text}
      </p>
      {showToggle ? (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className={cn(
            "mt-1.5 text-xs font-semibold transition-colors",
            expanded
              ? "text-muted-foreground hover:text-foreground"
              : inactive
                ? "text-zinc-500 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-600 dark:text-zinc-400 dark:decoration-zinc-600"
                : "text-[#9A5B2E] underline decoration-[#B87333]/40 underline-offset-2 hover:decoration-[#B87333] dark:text-amber-400 dark:decoration-amber-600/40 dark:hover:decoration-amber-500",
          )}
        >
          {expanded ? "Less" : "More"}
        </button>
      ) : null}
    </div>
  )
}

function OfferCardItem({
  ticker,
  subtitle,
  category,
  description,
  href,
  equity,
  term,
  minInvestment,
  issueDate,
  comingSoon,
}: OfferCard) {
  const isLive = !!href && !comingSoon
  const styles = isLive ? liveCopperCard : inactiveCard

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border transition-[box-shadow,border-color] duration-200",
        styles.shell,
      )}
    >
      <div className={cn("absolute inset-0", styles.glow)} aria-hidden />
      <div
        className={cn("relative h-1.5 w-full bg-gradient-to-r", styles.bar)}
        aria-hidden
      />

      <div className="relative flex flex-1 flex-col p-5">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className={cn(
                "text-[11px] font-semibold uppercase tracking-[0.14em]",
                styles.label,
              )}
            >
              {category}
            </p>
            <h3
              className={cn(
                "mt-2 font-heading text-2xl font-semibold tracking-tight",
                styles.title,
              )}
            >
              {ticker}
            </h3>
            <p className={cn("mt-0.5 text-sm", styles.subtitle)}>{subtitle}</p>
          </div>

          {comingSoon ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
              <LockIcon className="size-3" />
              Soon
            </span>
          ) : isLive ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Live
            </span>
          ) : null}
        </header>

        <ExpandableDescription text={description} inactive={!isLive} />

        <dl
          className={cn(
            "mt-auto grid grid-cols-3 gap-4 border-t pt-5",
            styles.divider,
          )}
        >
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Equity
            </dt>
            <dd
              className={cn(
                "mt-1 text-sm font-semibold tabular-nums tracking-tight",
                styles.stat,
              )}
            >
              {equity}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Term
            </dt>
            <dd className={cn("mt-1 text-sm font-semibold tracking-tight", styles.stat)}>
              {term}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Min. ticket
            </dt>
            <dd className={cn("mt-1 text-sm font-semibold tracking-tight", styles.stat)}>
              {minInvestment}
            </dd>
          </div>
        </dl>

        <footer className={cn("mt-4 flex flex-col gap-3 border-t pt-4", styles.divider)}>
          <p className="text-xs text-muted-foreground">Issue {issueDate}</p>

          {isLive ? (
            <Button
              className="w-full bg-[#B87333] text-white hover:bg-[#9A5B2E] dark:bg-[#B87333] dark:hover:bg-[#CD7F32]"
              size="lg"
              nativeButton={false}
              render={<Link href={href} />}
            >
              View offer
              <ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" />
            </Button>
          ) : (
            <Button
              className="w-full border-zinc-200 bg-zinc-100 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-400"
              size="lg"
              variant="outline"
              disabled
            >
              <LockIcon />
              Coming soon
            </Button>
          )}
        </footer>
      </div>
    </article>
  )
}

export function SectionCards() {
  const offers: OfferCard[] = [
    {
      ticker: "COPTT",
      subtitle: "Tokenized Copper",
      category: "Commodities",
      description:
        "A tokenized forward sale of in-ground copper reserves, giving institutional investors discounted, transparent, on-chain exposure to future copper production. Backed by geological certification, regulatory compliance, and optional physical redemption.",
      href: "/offers/coptt",
      accent: "copper",
      equity: "CHF 5.6M",
      term: "12 mo",
      minInvestment: "Open",
      issueDate: "Oct 2025",
    },
    {
      ticker: "TINTT",
      subtitle: "Tokenized Tin Reserve",
      category: "Commodities",
      description:
        "A tokenized forward sale of in-ground tin reserves from certified mines in Africa. Institutional investors gain discounted, transparent, on-chain exposure to future tin production — the essential solder metal powering every AI server and circuit board.",
      accent: "tin",
      equity: "$5.0M",
      term: "36 mo",
      minInvestment: "$25K",
      issueDate: "Feb 2026",
      comingSoon: true,
    },
    {
      ticker: "PANTT",
      subtitle: "Tokenized Solar Energy",
      category: "Green energy",
      description:
        "Tokenized exposure to 4 GW of solar plus 1.5 GW battery storage capacity across Rajasthan and Gujarat, India. Backed by 25-year Power Purchase Agreements with state utilities and private offtakers.",
      accent: "solar",
      equity: "$2.5M",
      term: "25 yr",
      minInvestment: "$50K",
      issueDate: "Jan 2026",
      comingSoon: true,
    },
    {
      ticker: "PANTT",
      subtitle: "Tokenized Solar Energy",
      category: "Real estate",
      description:
        "Tokenized real-asset exposure linked to solar infrastructure and long-duration offtake contracts across institutional-grade renewable projects in India.",
      accent: "estate",
      equity: "$2.5M",
      term: "25 yr",
      minInvestment: "$50K",
      issueDate: "Jan 2026",
      comingSoon: true,
    },
  ]

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <CopperPriceCard />
      <div className="grid auto-rows-fr grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {offers.map((offer, index) => (
          <OfferCardItem key={`${offer.ticker}-${offer.category}-${index}`} {...offer} />
        ))}
      </div>
    </div>
  )
}
