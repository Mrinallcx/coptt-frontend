"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  CheckCircle2Icon,
  CircleAlertIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  BellIcon,
  UserIcon,
  KeyRoundIcon,
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"
import { countryName } from "@/lib/countries"

export function SettingsContent() {
  const router = useRouter()
  const { user } = useAuth()
  const [notifications, setNotifications] = React.useState({
    email: true,
    push: false,
    sms: false,
  })
  const [twoFAEnabled, setTwoFAEnabled] = React.useState(false)
  // Source KYC status from the signed-in user. The existing card markup
  // only distinguishes 'verified' vs 'unverified', so collapse the real
  // backend states (none/in_progress/pending_review/approved/rejected/expired)
  // into that binary view: only "approved" is verified, everything else
  // routes the user to /kyc to (re)start or check status.
  const kycStatus: "none" | "verified" =
    user?.kyc_status === "approved" ? "verified" : "none"

  return (
    <div className="w-full max-w-2xl space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your account preferences and security.
        </p>
      </div>

      <Separator />

      {/* ── Profile Information ── */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <UserIcon className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">Profile Information</CardTitle>
          </div>
          <CardDescription>Update your personal details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name</Label>
            {/* Pre-filled from signup. Read-only for now — there's no
                PATCH /auth/me endpoint yet. Keys off user?.id so a switch
                of user causes React to remount with the new defaultValue. */}
            <Input
              id="name"
              key={`name-${user?.id ?? ""}`}
              defaultValue={user?.name ?? ""}
              placeholder="Your full name"
              readOnly
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              key={`email-${user?.id ?? ""}`}
              type="email"
              defaultValue={user?.email ?? ""}
              placeholder="you@example.com"
              readOnly
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              key={`country-${user?.id ?? ""}`}
              defaultValue={
                user?.country
                  ? `${countryName(user.country) ?? user.country} (${user.country})`
                  : ""
              }
              placeholder="Set at signup"
              readOnly
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" type="tel" defaultValue="" placeholder="+1 (555) 000-0000" />
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() =>
                toast.info(
                  "Profile editing isn't enabled yet — contact support to change your details.",
                )
              }
            >
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── KYC Verification ── */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">KYC Verification</CardTitle>
          </div>
          <CardDescription>
            Identity verification is required to unlock full investment access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {kycStatus === "none" ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 dark:border-amber-900 dark:bg-amber-950/30">
              <div className="flex items-start gap-3">
                <CircleAlertIcon className="size-5 text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">
                    KYC Not Verified
                  </p>
                  <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-500">
                    You have not completed identity verification. Some features may be restricted.
                  </p>
                  <Button
                    size="sm"
                    className="mt-3"
                    onClick={() => router.push("/kyc")}
                  >
                    Start KYC Verification
                  </Button>
                </div>
                <Badge
                  variant="outline"
                  className="shrink-0 border-amber-300 text-amber-700 text-xs"
                >
                  Unverified
                </Badge>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 dark:border-emerald-900 dark:bg-emerald-950/30">
              <div className="flex items-start gap-3">
                <CheckCircle2Icon className="size-5 text-emerald-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-400">
                    KYC Verified
                  </p>
                  <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-500">
                    Your identity has been verified. Full investment access is enabled.
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="shrink-0 border-emerald-300 text-emerald-700 text-xs"
                >
                  Verified
                </Badge>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border bg-muted/30 px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">Without KYC</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li className="flex items-center gap-1.5">
                  <CircleAlertIcon className="size-3 text-amber-500" /> View listings only
                </li>
                <li className="flex items-center gap-1.5">
                  <CircleAlertIcon className="size-3 text-amber-500" /> No investment access
                </li>
                <li className="flex items-center gap-1.5">
                  <CircleAlertIcon className="size-3 text-amber-500" /> Limited dashboard data
                </li>
              </ul>
            </div>
            <div className="rounded-lg border bg-muted/30 px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">With KYC</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2Icon className="size-3 text-emerald-500" /> Full investment access
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2Icon className="size-3 text-emerald-500" /> Token transfers enabled
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2Icon className="size-3 text-emerald-500" /> All deal details visible
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Two-Factor Authentication ── */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <KeyRoundIcon className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">Two-Factor Authentication</CardTitle>
          </div>
          <CardDescription>
            Add an extra layer of security using Google Authenticator.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-3">
              <SmartphoneIcon className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Google Authenticator</p>
                <p className="text-xs text-muted-foreground">
                  {twoFAEnabled ? "2FA is active on your account" : "Not configured yet"}
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={
                twoFAEnabled
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-muted text-muted-foreground"
              }
            >
              {twoFAEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>

          {!twoFAEnabled && (
            <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                Scan this QR code with the{" "}
                <span className="font-medium text-foreground">Google Authenticator</span> app to
                set up 2FA.
              </p>
              {/* Placeholder QR block */}
              <div className="mx-auto w-32 h-32 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 flex items-center justify-center text-xs text-muted-foreground">
                QR Code
              </div>
              <p className="text-center text-[10px] text-muted-foreground">
                Or enter setup key manually: <span className="font-mono font-medium tracking-widest">JBSWY3DPEHPK3PXP</span>
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="totp">Enter 6-digit code to confirm</Label>
                <div className="flex gap-2">
                  <Input
                    id="totp"
                    placeholder="000000"
                    maxLength={6}
                    className="font-mono tracking-widest text-center"
                  />
                  <Button
                    size="sm"
                    className="shrink-0"
                    onClick={() => setTwoFAEnabled(true)}
                  >
                    Verify & Enable
                  </Button>
                </div>
              </div>
            </div>
          )}

          {twoFAEnabled && (
            <div className="flex justify-between items-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/30">
              <div className="flex items-center gap-2">
                <CheckCircle2Icon className="size-4 text-emerald-600" />
                <p className="text-sm text-emerald-700 font-medium dark:text-emerald-400">
                  2FA is enabled and protecting your account.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setTwoFAEnabled(false)}
              >
                Disable
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Notifications ── */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <BellIcon className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">Notifications</CardTitle>
          </div>
          <CardDescription>Choose how you want to receive alerts and updates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(
            [
              {
                key: "email" as const,
                label: "Email Notifications",
                description: "Receive investment updates and reports by email",
              },
              {
                key: "push" as const,
                label: "Push Notifications",
                description: "Get real-time alerts in your browser",
              },
              {
                key: "sms" as const,
                label: "SMS Notifications",
                description: "Receive critical alerts via SMS",
              },
            ] as const
          ).map(({ key, label, description }) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-xl border bg-muted/20 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              {/* Toggle */}
              <button
                role="switch"
                aria-checked={notifications[key]}
                onClick={() =>
                  setNotifications((prev) => ({ ...prev, [key]: !prev[key] }))
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  notifications[key] ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                    notifications[key] ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          ))}
          <div className="flex justify-end pt-1">
            <Button size="sm">Save Preferences</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
