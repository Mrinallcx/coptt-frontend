"use client"

// Risk notice shown on entry to the portal, before anything else is
// usable. Mounted from the root layout so it covers signed-out pages
// (login, register, reset) as well as the app itself.
//
// Acknowledgement is stored per browser under a versioned key: bumping
// DISCLAIMER_VERSION forces every visitor to read and accept the notice
// again, which is what legal will want when the wording changes.

import { useCallback, useEffect, useState } from "react"
import { AlertTriangleIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

export const DISCLAIMER_VERSION = "v1"
const STORAGE_KEY = `coptt_disclaimer_accepted_${DISCLAIMER_VERSION}`

const RISKS = [
  "COPTT is a tokenized commodity product. Its value is linked to the price of copper, which can fall as well as rise — you may get back less than you invest, and you should be prepared to lose the entire amount.",
  "Nothing in this portal is investment, legal, or tax advice, and nothing here is an offer or solicitation in any jurisdiction where such an offer would be unlawful.",
  "Access requires identity verification (KYC) and anti-money-laundering checks. Eligibility to invest may be restricted depending on your country of residence and investor classification.",
  "Digital assets carry risks beyond the underlying commodity, including price volatility, loss or theft of wallet keys, smart-contract defects, network failure, and limited or no secondary market liquidity.",
  "Prices, charts, valuations, and any illustrations shown in this portal are indicative only. Past performance is not a reliable indicator of future results.",
  "Toto Finance does not guarantee any return, redemption value, or the ability to sell or transfer tokens at a particular price or time.",
]

export function DisclaimerGate() {
  // Undecided until the effect below has read localStorage. Rendering
  // nothing in that window keeps the server and client markup identical.
  const [accepted, setAccepted] = useState<boolean | null>(null)
  const [declined, setDeclined] = useState(false)

  useEffect(() => {
    try {
      setAccepted(window.localStorage.getItem(STORAGE_KEY) === "true")
    } catch {
      // Private browsing or storage disabled: show the notice rather
      // than silently skipping it.
      setAccepted(false)
    }
  }, [])

  const accept = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "true")
    } catch {
      // Can't persist — the notice will reappear next visit, which is
      // the safe direction to fail in.
    }
    setAccepted(true)
  }, [])

  const open = accepted === false

  // Hold the page still while the notice is up, so content behind the
  // overlay can't be scrolled or read past it.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-title"
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border bg-background shadow-lg">
        <div className="flex items-start gap-3 border-b px-6 py-5">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
            <AlertTriangleIcon className="size-5" />
          </span>
          <div className="space-y-1">
            <h2 id="disclaimer-title" className="text-lg font-semibold">
              Important risk notice
            </h2>
            <p className="text-sm text-muted-foreground">
              Please read this before using the Toto Finance investor
              portal.
            </p>
          </div>
        </div>

        {declined ? (
          <div className="space-y-3 px-6 py-6 text-sm">
            <p className="font-medium">
              You need to accept the risk notice to use the portal.
            </p>
            <p className="text-muted-foreground">
              Nothing has been shared or activated on your account. If you
              have questions about these risks, contact us at{" "}
              <a
                href="mailto:support@totofinance.co"
                className="font-medium underline underline-offset-4"
              >
                support@totofinance.co
              </a>{" "}
              before continuing.
            </p>
          </div>
        ) : (
          <div className="overflow-y-auto px-6 py-5">
            <ul className="space-y-3 text-sm text-muted-foreground">
              {RISKS.map((risk) => (
                <li key={risk} className="flex gap-2">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {declined
              ? "You can review the notice again at any time."
              : "By continuing you confirm you have read and understood this notice."}
          </p>
          <div className="flex gap-2 sm:justify-end">
            {declined ? (
              <Button type="button" onClick={() => setDeclined(false)}>
                Review the notice
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDeclined(true)}
                >
                  Decline
                </Button>
                <Button type="button" autoFocus onClick={accept}>
                  I understand and agree
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
