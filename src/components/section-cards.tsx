"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRightIcon, LockIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CopperPriceCard } from "@/components/copper-price"
import { CopperPriceChart } from "@/components/copper-price-chart"
import { cn } from "@/lib/utils"

type OfferAccent = "copper" | "tin" | "solar" | "estate"

type OfferSpec = {
  label: string
  value: string
}

type OfferCard = {
  ticker: string
  subtitle: string
  category: string
  description: string
  href?: string
  accent: OfferAccent
  equity?: string
  term?: string
  minInvestment?: string
  issueDate?: string
  comingSoon?: boolean
  specs?: OfferSpec[]
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
  specs,
}: OfferCard) {
  const isLive = !!href && !comingSoon
  const styles = isLive ? liveCopperCard : inactiveCard
  const hasSpecs = !!specs?.length

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

        {hasSpecs && specs ? (
          <dl className={cn("mt-4 divide-y", styles.divider)}>
            {specs.map((spec) => (
              <div
                key={spec.label}
                className="grid grid-cols-[8.5rem_1fr] gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <dt
                  className={cn(
                    "text-[11px] font-medium uppercase tracking-wide",
                    isLive
                      ? "text-muted-foreground"
                      : "text-zinc-400 dark:text-zinc-500",
                  )}
                >
                  {spec.label}
                </dt>
                <dd className={cn("text-sm leading-snug", styles.stat)}>{spec.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <>
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
          </>
        )}

        <footer
          className={cn(
            "flex flex-col gap-3 border-t pt-4",
            hasSpecs ? "mt-auto" : "mt-4",
            styles.divider,
          )}
        >
          {issueDate ? (
            <p className="text-xs text-muted-foreground">Issue {issueDate}</p>
          ) : null}

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
      subtitle: "New Orleans Vault",
      category: "Commodities",
      description:
        "LME Grade A copper cathode held in an LME-listed bonded warehouse in New Orleans.",
      href: "/offers/coptt",
      accent: "copper",
      specs: [
        {
          label: "Underlying",
          value:
            "LME Grade A copper cathode, Cu-CATH-1 (BS EN 1978), min. 99.9935% Cu",
        },
        {
          label: "Location",
          value: "New Orleans, LA, USA — LME-listed bonded warehouse",
        },
        {
          label: "Live price",
          value:
            "LME Cash Settlement + New Orleans in-warehouse premium (oracle-fed, real-time)",
        },
        {
          label: "Available",
          value: "[X,000 tonnes] — confirm from current warrant inventory",
        },
        {
          label: "Min. ticket",
          value: "1 COPTTT (1 lb) — institutional minimums per Reg D 506(b)/Reg S",
        },
      ],
    },
    {
      ticker: "COPTTT",
      subtitle: "Rotterdam Vault",
      category: "Commodities",
      description:
        "LME Grade A copper cathode held in an LME-listed bonded warehouse in Rotterdam.",
      accent: "copper",
      comingSoon: true,
      specs: [
        {
          label: "Underlying",
          value:
            "LME Grade A copper cathode, Cu-CATH-1 (BS EN 1978), min. 99.9935% Cu",
        },
        {
          label: "Location",
          value: "Rotterdam (Maasvlakte), Netherlands — LME-listed bonded warehouse",
        },
        {
          label: "Live price",
          value: "LME Cash Settlement + Rotterdam in-warehouse premium (oracle-fed)",
        },
        {
          label: "Available",
          value: "[X,000 tonnes]",
        },
        {
          label: "Min. ticket",
          value: "1 COPTTT (1 lb)",
        },
      ],
    },
    {
      ticker: "COPTtr",
      subtitle: "Los Azules, Argentina",
      category: "Commodities",
      description:
        "Tokenized exposure to the Los Azules open-pit copper deposit in San Juan Province, Argentina.",
      accent: "copper",
      comingSoon: true,
      specs: [
        {
          label: "Deposit",
          value:
            "Los Azules, San Juan Province — open-pit, heap-leach/SX-EW porphyry copper",
        },
        {
          label: "Mining partner",
          value:
            "McEwen Copper Inc. (subsidiary of McEwen Inc., NYSE/TSX: MUX)",
        },
        {
          label: "Stage",
          value: "Pre-production — feasibility complete, FID targeted late 2026",
        },
        {
          label: "Exposure",
          value:
            "500,000 tonnes physical copper (~$5B+ notional at current pricing)",
        },
        {
          label: "First production",
          value: "2030",
        },
      ],
    },
    {
      ticker: "COPTTR",
      subtitle: "Kamoa-Kakula, DRC",
      category: "Commodities",
      description:
        "Tokenized exposure to the Kamoa-Kakula high-grade underground copper mine in the DRC.",
      accent: "copper",
      comingSoon: true,
      specs: [
        {
          label: "Deposit",
          value:
            "Kamoa-Kakula, Kolwezi district, Lualaba Province, DRC — high-grade underground",
        },
        {
          label: "Mining partner",
          value:
            "Ivanhoe Mines (indirect 39.6%) / Zijin Mining (indirect 39.6%), operated via Kamoa Holding",
        },
        {
          label: "Stage",
          value: "Active production, ramping — not pre-production like Los Azules",
        },
        {
          label: "Exposure",
          value: "[TBD — to be set once mandate is executed]",
        },
        {
          label: "Run-rate",
          value:
            "~290,000–330,000 t/y (2026 guidance), scaling toward 500,000+ t/y from 2028",
        },
      ],
    },
  ]

  const featuredOffers = offers.slice(0, 3)
  const nextOffers = offers.slice(3)

  return (
    <div className="flex flex-col gap-8 px-4 lg:px-6">
      <CopperPriceCard />
      <CopperPriceChart />
      <div className="grid auto-rows-fr grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
        {featuredOffers.map((offer, index) => (
          <OfferCardItem key={`${offer.ticker}-${offer.category}-${index}`} {...offer} />
        ))}
      </div>
      {nextOffers.length > 0 ? (
        <div className="grid auto-rows-fr grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
          {nextOffers.map((offer, index) => (
            <OfferCardItem key={`${offer.ticker}-${offer.category}-${index + 3}`} {...offer} />
          ))}
        </div>
      ) : null}
    </div>
  )
}
