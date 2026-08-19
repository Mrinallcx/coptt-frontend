"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  BellIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  CircleAlertIcon,
  ClockIcon,
  KeyRoundIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  XCircleIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { countryName } from "@/lib/countries"
import type { KYCStatus } from "@/lib/api"

type KYCUi = {
  label: string
  headline: string
  description: string
  cta: string | null
  tone: "success" | "warning" | "info" | "danger"
}

const kycUi: Record<KYCStatus, KYCUi> = {
  approved: {
    label: "Verified",
    headline: "Identity verified",
    description: "You have full investment access.",
    cta: null,
    tone: "success",
  },
  none: {
    label: "Not started",
    headline: "Verification required",
    description: "Complete KYC to invest and mint tokens.",
    cta: "Start verification",
    tone: "warning",
  },
  in_progress: {
    label: "In progress",
    headline: "Verification in progress",
    description: "Continue where you left off.",
    cta: "Continue verification",
    tone: "warning",
  },
  pending_review: {
    label: "Under review",
    headline: "Documents under review",
    description: "Review usually takes 1–2 business days.",
    cta: "View status",
    tone: "info",
  },
  rejected: {
    label: "Rejected",
    headline: "Verification unsuccessful",
    description: "Retry with updated documents.",
    cta: "Retry verification",
    tone: "danger",
  },
  expired: {
    label: "Expired",
    headline: "Verification expired",
    description: "Renew to restore full access.",
    cta: "Renew verification",
    tone: "warning",
  },
}

const kycToneClass = {
  success: "border-emerald-200 bg-emerald-50/50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50/50 text-amber-900",
  info: "border-sky-200 bg-sky-50/50 text-sky-900",
  danger: "border-red-200 bg-red-50/50 text-red-900",
}

function getInitials(name: string, email: string): string {
  const source = name.trim() || email.split("@")[0]?.replace(/[._-]+/g, " ") || ""
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
}

function SettingsBlock({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="rounded-xl border bg-card">{children}</div>
    </section>
  )
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium sm:text-right">{value || "—"}</span>
    </div>
  )
}

function KycStatusIcon({ tone }: { tone: KYCUi["tone"] }) {
  if (tone === "success") return <CheckCircle2Icon className="size-4 shrink-0" />
  if (tone === "danger") return <XCircleIcon className="size-4 shrink-0" />
  if (tone === "info") return <ClockIcon className="size-4 shrink-0" />
  return <CircleAlertIcon className="size-4 shrink-0" />
}

export function SettingsContent() {
  const router = useRouter()
  const { user } = useAuth()
  const [notifications, setNotifications] = React.useState({
    email: true,
    push: false,
    sms: false,
  })
  const [twoFAEnabled, setTwoFAEnabled] = React.useState(false)
  const [showTwoFASetup, setShowTwoFASetup] = React.useState(false)

  const kyc = kycUi[user?.kyc_status ?? "none"]
  const displayName = user?.name?.trim() || user?.email?.split("@")[0] || "Investor"
  const countryDisplay = user?.country
    ? `${countryName(user.country) ?? user.country} (${user.country})`
    : "Not set"

  return (
    <div className="mx-auto w-full max-w-2xl space-y-10">
      <header className="flex items-center gap-4">
        <Avatar className="size-12">
          <AvatarImage src={user?.picture} alt={displayName} />
          <AvatarFallback className="bg-muted text-sm font-medium">
            {getInitials(user?.name ?? "", user?.email ?? "")}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
          <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <div className="hidden shrink-0 flex-wrap justify-end gap-2 sm:flex">
          {user?.email_verified ? (
            <Badge variant="secondary">Email verified</Badge>
          ) : (
            <Badge variant="outline">Email unverified</Badge>
          )}
          <Badge variant="outline">KYC · {kyc.label}</Badge>
        </div>
      </header>

      <SettingsBlock title="Profile" description="Registered account details.">
        <div className="divide-y">
          <FieldRow label="Name" value={user?.name ?? ""} />
          <FieldRow label="Email" value={user?.email ?? ""} />
          <FieldRow label="Country" value={countryDisplay} />
          <FieldRow label="Phone" value="" />
        </div>
        <p className="border-t px-4 py-3 text-xs text-muted-foreground">
          Profile edits aren&apos;t self-serve yet. Contact support to update your details.
        </p>
      </SettingsBlock>

      <SettingsBlock title="Identity verification" description="Required for investing.">
        <div className={cn("border-b px-4 py-4", kycToneClass[kyc.tone])}>
          <div className="flex items-start gap-3">
            <KycStatusIcon tone={kyc.tone} />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-medium">{kyc.headline}</p>
              <p className="text-sm opacity-80">{kyc.description}</p>
            </div>
            <Badge variant="outline" className="shrink-0 bg-background/80">
              {kyc.label}
            </Badge>
          </div>
          {kyc.cta ? (
            <Button
              size="sm"
              className="mt-4"
              onClick={() => router.push("/kyc")}
            >
              {kyc.cta}
              <ChevronRightIcon />
            </Button>
          ) : null}
        </div>
        <div className="px-4 py-3 text-xs text-muted-foreground">
          Verified accounts can invest, mint tokens, and access full offer details.
        </div>
      </SettingsBlock>

      <SettingsBlock title="Security" description="Protect your account.">
        <div className="flex items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <SmartphoneIcon className="size-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Two-factor authentication</p>
              <p className="text-xs text-muted-foreground">
                {twoFAEnabled ? "Enabled" : "Not configured"}
              </p>
            </div>
          </div>
          {!twoFAEnabled && !showTwoFASetup ? (
            <Button size="sm" variant="outline" onClick={() => setShowTwoFASetup(true)}>
              Set up
            </Button>
          ) : twoFAEnabled ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setTwoFAEnabled(false)
                setShowTwoFASetup(false)
              }}
            >
              Disable
            </Button>
          ) : null}
        </div>

        {showTwoFASetup && !twoFAEnabled ? (
          <>
            <Separator />
            <div className="space-y-3 px-4 py-4">
              <p className="text-xs text-muted-foreground">
                Scan with Google Authenticator, then enter your 6-digit code.
              </p>
              <div className="flex gap-2">
                <Input
                  id="totp"
                  placeholder="000000"
                  maxLength={6}
                  className="font-mono tracking-widest"
                />
                <Button size="sm" onClick={() => setTwoFAEnabled(true)}>
                  Enable
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-0 text-muted-foreground"
                onClick={() => setShowTwoFASetup(false)}
              >
                Cancel
              </Button>
            </div>
          </>
        ) : null}
      </SettingsBlock>

      <SettingsBlock title="Notifications">
        <div className="divide-y">
          {(
            [
              { key: "email" as const, label: "Email", hint: "Updates and reports" },
              { key: "push" as const, label: "Push", hint: "Browser alerts" },
              { key: "sms" as const, label: "SMS", hint: "Critical alerts" },
            ] as const
          ).map(({ key, label, hint }) => (
            <div
              key={key}
              className="flex items-center justify-between gap-4 px-4 py-3.5"
            >
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{hint}</p>
              </div>
              <Switch
                checked={notifications[key]}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({ ...prev, [key]: checked }))
                }
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end border-t px-4 py-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.success("Notification preferences saved")}
          >
            Save
          </Button>
        </div>
      </SettingsBlock>
    </div>
  )
}
