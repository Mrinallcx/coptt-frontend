import { AppSidebar } from "@/components/app-sidebar"
import { KycFlow } from "@/components/kyc-flow"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

// KYC verification page. Same SidebarInset/SiteHeader shell as the rest of
// the app so the layout is consistent. All the actual widget mounting and
// status handling lives in <KycFlow /> — a client component.
export default function KycPage() {
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
        <div className="flex flex-1 flex-col items-center py-8 px-4">
          <KycFlow />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
