import { AppSidebar } from "@/components/app-sidebar"
import { SettingsContent } from "@/components/settings-content"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function SettingsPage() {
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
          <SettingsContent />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
