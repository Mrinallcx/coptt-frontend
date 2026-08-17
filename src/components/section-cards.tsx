"use client"

import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type CardImageProps = {
  badge: string
  title: string
  description: string
  imageUrl: string
  imageAlt: string
  cta: string
  /** Where View-Offer routes. When absent, the button stays inert. */
  href?: string
  details?: { label: string; value: string }[]
  teaserBlur?: boolean
}

function CardImage({
  badge,
  title,
  description,
  imageUrl,
  imageAlt,
  cta,
  href,
  details,
  teaserBlur,
}: CardImageProps) {
  return (
    <Card className="relative w-full overflow-hidden pt-0">
      <div className="absolute inset-0 z-30 aspect-video bg-black/35" />
      <img
        src={imageUrl}
        alt={imageAlt}
        className="relative z-40 aspect-video w-full object-cover brightness-60 grayscale dark:brightness-40"
      />
      <CardHeader className="relative z-40">
        <CardAction>
          <Badge variant="secondary">{badge}</Badge>
        </CardAction>
        <CardTitle>{title}</CardTitle>
        {!teaserBlur ? (
          <CardDescription className="line-clamp-2">{description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardFooter
        className={`relative flex-col items-stretch gap-4 ${teaserBlur ? "z-10" : "z-40"}`}
      >
        {details?.length ? (
          <div className="space-y-2 text-sm">
            {details.map((detail) => (
              <div
                key={detail.label}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-muted-foreground">{detail.label}</span>
                <span className="text-right font-medium">{detail.value}</span>
              </div>
            ))}
          </div>
        ) : null}
        {href ? (
          <Button className="w-full" render={<Link href={href} />}>
            {cta}
          </Button>
        ) : (
          <Button className="w-full" disabled>
            {cta}
          </Button>
        )}
      </CardFooter>
      {teaserBlur ? (
        <div className="absolute inset-x-0 bottom-0 top-[45%] z-20 bg-transparent backdrop-blur-md" />
      ) : null}
    </Card>
  )
}

export function SectionCards() {
  const cards: CardImageProps[] = [
    {
      badge: "Commodities",
      title: "COPTT — Tokenized Copper",
      description:
        "A tokenized forward sale of in-ground copper reserves, giving institutional investors discounted, transparent, on-chain exposure to future copper production. Backed by geological certification, regulatory compliance, and optional physical redemption.",
      imageUrl: "https://avatar.vercel.sh/coptt",
      imageAlt: "COPTT copper reserve cover",
      cta: "View Offer",
      href: "/offers/coptt",
      details: [
        { label: "Equity", value: "CHF 5,600,000" },
        { label: "Type of Investment", value: "Equity" },
        { label: "Min. Investment Amount", value: "N/A" },
        { label: "Max. Investment Amount", value: "N/A" },
        { label: "Issue Date", value: "15 October 2025" },
        { label: "Term", value: "12 months" },
      ],
    },
    {
      badge: "Commodities",
      title: "TINTT — Tokenized Tin Reserve",
      description:
        "A tokenized forward sale of in-ground tin reserves from certified mines in Africa. Institutional investors gain discounted, transparent, on-chain exposure to future tin production - the essential solder metal powering every AI server and circuit board.",
      imageUrl: "https://avatar.vercel.sh/tintt",
      imageAlt: "TINTT tin reserve cover",
      cta: "View Offer",
      details: [
        { label: "Equity", value: "$5,000,000" },
        { label: "Type of Investment", value: "Equity" },
        { label: "Min. Investment Amount", value: "$25,000" },
        { label: "Max. Investment Amount", value: "$1,000,000" },
        { label: "Issue Date", value: "1 February 2026" },
        { label: "Term", value: "36 months" },
      ],
    },
    {
      badge: "Green energy",
      title: "PANTT — Tokenized Solar Energy",
      description:
        "Tokenized exposure to 4 GW of solar + 1.5 GW battery storage capacity across Rajasthan and Gujarat, India. Backed by 25-year Power Purchase Agreements with state utilities and private offtakers.",
      imageUrl: "https://avatar.vercel.sh/pantt",
      imageAlt: "PANTT solar energy infrastructure cover",
      cta: "View Offer",
      details: [
        { label: "Equity", value: "$2,500,000" },
        { label: "Type of Investment", value: "Revenue Share" },
        { label: "Min. Investment Amount", value: "$50,000" },
        { label: "Max. Investment Amount", value: "$2,000,000" },
        { label: "Issue Date", value: "15 January 2026" },
        { label: "Term", value: "25 years (PPA)" },
      ],
    },
    {
      badge: "Real Estate",
      title: "PANTT — Tokenized Solar Energy",
      description:
        "Tokenized exposure to 4 GW of solar + 1.5 GW battery storage capacity across Rajasthan and Gujarat, India. Backed by 25-year Power Purchase Agreements with state utilities and private offtakers.",
      imageUrl: "https://avatar.vercel.sh/pantt",
      imageAlt: "PANTT solar energy infrastructure cover",
      cta: "View Offer",
      details: [
        { label: "Equity", value: "$2,500,000" },
        { label: "Type of Investment", value: "Revenue Share" },
        { label: "Min. Investment Amount", value: "$50,000" },
        { label: "Max. Investment Amount", value: "$2,000,000" },
        { label: "Issue Date", value: "15 January 2026" },
        { label: "Term", value: "25 years (PPA)" },
      ],
      teaserBlur: true,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {cards.map((card, index) => (
        <CardImage key={`${card.title}-${index}`} {...card} />
      ))}
    </div>
  )
}
