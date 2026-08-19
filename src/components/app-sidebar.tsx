"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  CircleHelpIcon,
  FolderIcon,
  LayoutDashboardIcon,
} from "lucide-react"

import { useAuth } from "@/contexts/auth-context"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: (
        <LayoutDashboardIcon
        />
      ),
    },
    {
      title: "Investments",
      url: "/investments",
      icon: (
        <FolderIcon
        />
      ),
    },
  ],
  navSecondary: [
    {
      title: "Get Help",
      url: "#",
      icon: (
        <CircleHelpIcon
        />
      ),
    },
  ],
}
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  // The signed-in user from auth context. On first render (before
  // AuthProvider's hydration effect has run) it's null — we fall back to
  // empty strings so the layout doesn't shift; once hydrated the real
  // values populate in place.
  const { user } = useAuth()
  const sidebarUser = {
    name: user?.name || user?.email?.split("@")[0] || "",
    email: user?.email || "",
    avatar: user?.picture || "",
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<a href="/dashboard" />}
            >
              <img
                src="/logo.png"
                alt="Toto Finance logo"
                className="size-6 object-contain"
              />
              <span className="text-base font-semibold">Toto Finance</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={sidebarUser} />
      </SidebarFooter>
    </Sidebar>
  )
}
