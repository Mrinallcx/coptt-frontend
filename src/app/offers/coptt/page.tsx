import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { CopperPriceCard } from "@/components/copper-price"
import { CopperPriceChart } from "@/components/copper-price-chart"
import { OfferCoptt } from "@/components/offer-coptt"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

// /offers/coptt — the destination of the "View Offer" button on the
// COPTT card in the dashboard. Renders the offer terms + the live copper
// price + a (placeholder) Buy CTA that the mint flow will land on in v2.
export default function CopttOfferPage() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col px-4 py-6 md:py-8 lg:px-6">
              <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
                <Link
                  href="/dashboard"
                  className="-ml-2 inline-flex h-8 w-fit items-center gap-1.5 rounded-md px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ArrowLeftIcon className="size-3.5" />
                  Back to dashboard
                </Link>
                <CopperPriceCard />
                <CopperPriceChart defaultRange="30d" />
                <OfferCoptt />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
