"use client"

// KYC verification flow — hosts the LCX widget for the active path and
// renders terminal-state cards for the rest.
//
// Status mapping (sourced from /kyc/status, which is the freshest read):
//
//   none / in_progress  → mint a vendor session, load + mount LCX widget
//   pending_review      → "we're reviewing" pane, poll /kyc/status every 15s
//   approved            → "verified" pane with approved_at + expires_at
//   rejected / expired  → reason + retry path (clicking 'Start over' mints
//                         a fresh session — LCX re-uses the same applicant)
//
// LCX assets: ${widget_base_url}/kyc-widget.js + .css at the host root
// (NOT under /kyc-widget/...). Loaded idempotently so re-renders don't
// double-inject the script tag.

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  Loader2Icon,
  RefreshCcwIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { useAuth } from "@/contexts/auth-context"
import {
  ApiRequestError,
  kycApi,
  type KYCStatus,
  type KYCStatusResponse,
  type VendorSessionResponse,
} from "@/lib/api"
import type { KYCWidgetInstance } from "@/types/lcx-widget"

const WIDGET_CONTAINER_ID = "lcx-kyc-container"

export function KycFlow() {
  const router = useRouter()
  const { user, accessToken, refreshProfile } = useAuth()

  const [status, setStatus] = useState<KYCStatusResponse | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [vendorBooting, setVendorBooting] = useState(false)
  const [vendorError, setVendorError] = useState<string | null>(null)
  const [completionStatus, setCompletionStatus] = useState<string | null>(null)

  // Widget instance — kept in a ref so we can destroy it on unmount /
  // status flip without dragging it through React state.
  const widgetRef = useRef<KYCWidgetInstance | null>(null)
  const mountStartedRef = useRef(false)

  // --- Initial status load -------------------------------------------

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false
    ;(async () => {
      try {
        const s = await kycApi.getStatus(accessToken)
        if (!cancelled) setStatus(s)
      } catch (err) {
        if (!cancelled) {
          setStatusError(
            err instanceof Error ? err.message : "Couldn't load KYC status.",
          )
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [accessToken])

  // --- Poll while pending_review ------------------------------------

  useEffect(() => {
    if (!accessToken) return
    if (status?.status !== "pending_review") return
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return

    const id = setInterval(async () => {
      try {
        const fresh = await kycApi.getStatus(accessToken)
        setStatus(fresh)
        if (fresh.status !== "pending_review") {
          await refreshProfile()
        }
      } catch {
        /* ignore — next tick will retry */
      }
    }, 15_000)
    return () => clearInterval(id)
  }, [accessToken, status?.status, refreshProfile])

  // --- Widget lifecycle ---------------------------------------------

  const shouldShowWidget =
    status && (status.status === "none" || status.status === "in_progress")

  useEffect(() => {
    if (!accessToken || !shouldShowWidget) return
    if (mountStartedRef.current) return
    mountStartedRef.current = true

    let cancelled = false
    setVendorBooting(true)
    setVendorError(null)

    ;(async () => {
      let session: VendorSessionResponse
      try {
        session = await kycApi.createVendorSession(accessToken)
      } catch (err) {
        if (cancelled) return
        setVendorBooting(false)
        if (err instanceof ApiRequestError && err.status === 503) {
          setVendorError(
            "The hosted KYC service isn't configured on the backend. Set LCX_API_KEY and restart.",
          )
        } else {
          setVendorError(err instanceof Error ? err.message : "Couldn't start verification.")
        }
        return
      }

      try {
        await ensureWidgetAssets(session.widget_base_url)
      } catch (err) {
        if (cancelled) return
        setVendorBooting(false)
        setVendorError(
          err instanceof Error
            ? `Couldn't load the verification widget. ${err.message}`
            : "Couldn't load the verification widget.",
        )
        return
      }

      if (cancelled) return
      if (!window.KYCWidget) {
        setVendorBooting(false)
        setVendorError("Verification widget didn't initialise — try reloading.")
        return
      }

      try {
        widgetRef.current = window.KYCWidget.init({
          containerId: WIDGET_CONTAINER_ID,
          sessionToken: session.session_token,
          apiUrl: `${session.widget_base_url.replace(/\/$/, "")}/api/v1`,
          theme: "light",
          onComplete: (result) => {
            setCompletionStatus(result.status)
            void (async () => {
              if (!accessToken) return
              try {
                const fresh = await kycApi.getStatus(accessToken)
                setStatus(fresh)
              } catch {
                /* ignore */
              }
              await refreshProfile()
            })()
          },
          onError: (e) => {
            setVendorError(`${e.code}: ${e.message}`)
          },
        })
        setVendorBooting(false)
      } catch (err) {
        setVendorBooting(false)
        setVendorError(err instanceof Error ? err.message : "Failed to mount the widget.")
      }
    })()

    return () => {
      cancelled = true
    }
  }, [accessToken, shouldShowWidget, refreshProfile])

  // Destroy widget on unmount or when the status flips out of active.
  useEffect(() => {
    return () => {
      if (widgetRef.current) {
        try {
          widgetRef.current.destroy()
        } catch {
          /* ignore */
        }
        widgetRef.current = null
      }
    }
  }, [])

  // --- Retry path (rejected / expired) ------------------------------

  async function handleStartOver() {
    if (!accessToken) return
    // The backend's POST /kyc/session is idempotent — minting a new
    // session on a rejected profile flips it back to in_progress on
    // LCX's side and lets the user re-attempt. We refresh status so the
    // widget mount effect picks it up.
    try {
      setVendorError(null)
      setVendorBooting(true)
      await kycApi.createVendorSession(accessToken)
      const fresh = await kycApi.getStatus(accessToken)
      setStatus(fresh)
      mountStartedRef.current = false // allow re-mount
    } catch (err) {
      setVendorError(err instanceof Error ? err.message : "Couldn't restart KYC.")
    } finally {
      setVendorBooting(false)
    }
  }

  // --- Render ---------------------------------------------------------

  if (!user) {
    // Should be unreachable thanks to the proxy guard, but be safe.
    return null
  }

  return (
    <div className="w-full max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Identity verification</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Confirm your identity to unlock full investment access. Verification
          is handled by LCX — we never see your raw documents.
        </p>
      </div>

      {statusError && (
        <Card className="border-destructive/40">
          <CardContent className="pt-6">
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircleIcon className="size-4 mt-0.5 shrink-0" />
              <span>{statusError}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {!status && !statusError && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Loader2Icon className="mx-auto mb-2 size-5 animate-spin" />
            <p className="text-sm">Loading verification status…</p>
          </CardContent>
        </Card>
      )}

      {status?.status === "pending_review" && (
        <TerminalCard
          icon={<Loader2Icon className="size-5 animate-spin" />}
          title="We're reviewing your submission"
          description="An admin will review your documents shortly. We'll email you when there's a decision."
          tone="info"
        />
      )}

      {status?.status === "approved" && (
        <TerminalCard
          icon={<CheckCircle2Icon className="size-5 text-emerald-600" />}
          title="Verification complete"
          description={
            status.approved_at
              ? `Your identity has been verified since ${formatDate(status.approved_at)}.`
              : "Your identity has been verified."
          }
          tone="success"
          action={
            <Button onClick={() => router.push("/dashboard")}>
              Go to dashboard
            </Button>
          }
        />
      )}

      {(status?.status === "rejected" || status?.status === "expired") && (
        <TerminalCard
          icon={<XCircleIcon className="size-5 text-destructive" />}
          title={
            status.status === "expired"
              ? "Your verification has expired"
              : "We couldn't verify your identity"
          }
          description={
            status.rejection_reason ||
            "Please update the flagged document and try again."
          }
          tone="danger"
          action={
            <Button onClick={handleStartOver} disabled={vendorBooting}>
              {vendorBooting ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <RefreshCcwIcon />
              )}
              Start over
            </Button>
          }
        />
      )}

      {shouldShowWidget && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="size-4 text-muted-foreground" />
              <CardTitle className="text-base">Verification flow</CardTitle>
            </div>
            <CardDescription>
              The widget below walks you through personal info, document
              upload, and a liveness check. It takes about 3 minutes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {vendorBooting && (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                <Loader2Icon className="mr-2 size-4 animate-spin" />
                Loading verification widget…
              </div>
            )}

            {vendorError && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
                <AlertCircleIcon className="size-4 mt-0.5 shrink-0" />
                <span>{vendorError}</span>
              </div>
            )}

            {completionStatus && (
              <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs">
                <CheckCircle2Icon className="size-4 mt-0.5 shrink-0 text-emerald-600" />
                <span>
                  Submission received. We&apos;ll email you when there&apos;s
                  a decision.
                </span>
              </div>
            )}

            {/* LCX mounts its UI inside this div via containerId. */}
            <div
              id={WIDGET_CONTAINER_ID}
              className="min-h-[400px] rounded-md border border-border bg-muted/20"
            />

            <p className="text-xs text-muted-foreground text-center">
              Powered by LCX. Your documents are stored on their secure
              servers — we only receive the final verdict.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// --- Sub-components ----------------------------------------------------

function TerminalCard({
  icon,
  title,
  description,
  tone,
  action,
}: {
  icon: React.ReactNode
  title: string
  description: string
  tone: "info" | "success" | "danger"
  action?: React.ReactNode
}) {
  const ring =
    tone === "success"
      ? "border-emerald-500/30 bg-emerald-500/5"
      : tone === "danger"
        ? "border-destructive/30 bg-destructive/5"
        : "border-primary/30 bg-primary/5"
  return (
    <Card className={ring}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {action && <CardContent>{action}</CardContent>}
    </Card>
  )
}

// --- Asset loader (idempotent JS + CSS) -------------------------------

const widgetAssetPromises = new Map<string, Promise<void>>()

function ensureWidgetAssets(widgetBaseUrl: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (window.KYCWidget) return Promise.resolve()
  const base = widgetBaseUrl.replace(/\/$/, "")
  const jsSrc = `${base}/kyc-widget.js`
  const cssSrc = `${base}/kyc-widget.css`
  const cached = widgetAssetPromises.get(jsSrc)
  if (cached) return cached

  const both = Promise.all([injectScript(jsSrc), injectCss(cssSrc)]).then(
    () => undefined,
  )
  widgetAssetPromises.set(jsSrc, both)
  return both
}

function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${src}"]`,
    )
    if (existing) {
      if (window.KYCWidget) return resolve()
      existing.addEventListener("load", () => resolve())
      existing.addEventListener("error", () =>
        reject(new Error(`failed to load ${src}`)),
      )
      return
    }
    const s = document.createElement("script")
    s.src = src
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`failed to load ${src}`))
    document.head.appendChild(s)
  })
}

function injectCss(href: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLLinkElement>(
      `link[rel="stylesheet"][href="${href}"]`,
    )
    if (existing) return resolve()
    const l = document.createElement("link")
    l.rel = "stylesheet"
    l.href = href
    l.onload = () => resolve()
    l.onerror = () => reject(new Error(`failed to load ${href}`))
    document.head.appendChild(l)
  })
}

// --- Helpers ----------------------------------------------------------

function formatDate(iso: string | null): string {
  if (!iso) return ""
  try {
    return new Date(iso).toLocaleDateString()
  } catch {
    return iso
  }
}

// Suppress an unused-import lint when KYCStatus is otherwise indirectly used.
export type _Suppress = KYCStatus
