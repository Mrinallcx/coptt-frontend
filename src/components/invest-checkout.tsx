"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  ArrowRightIcon,
  CheckIcon,
  LandmarkIcon,
  Loader2Icon,
  WalletIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const USD_PER_MT = 14_500
const MIN_MT = 1

type PayMethod = "wallet" | "bank"
type Step = "amount" | "pay" | "confirm" | "done"

interface EthereumProvider {
  isMetaMask?: boolean
  isPhantom?: boolean
  providers?: EthereumProvider[]
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

function getProvider(): EthereumProvider | null {
  if (typeof window === "undefined") return null
  const eth = (window as Window & { ethereum?: EthereumProvider }).ethereum
  if (!eth) return null
  const list = Array.isArray(eth.providers) && eth.providers.length > 0 ? eth.providers : [eth]
  return (
    list.find((p) => p.isMetaMask && !p.isPhantom) ??
    list.find((p) => !p.isPhantom) ??
    list[0]
  )
}

function formatUsd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n)
}

function formatMt(n: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 4,
  }).format(n)
}

function parseAmount(value: string) {
  const n = Number.parseFloat(value.replace(/,/g, ""))
  return Number.isFinite(n) && n > 0 ? n : null
}

export function InvestCheckout() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>("amount")
  const priceMt = USD_PER_MT
  const [usdInput, setUsdInput] = useState(USD_PER_MT.toFixed(2))
  const [mtInput, setMtInput] = useState("1")
  const [lastEdited, setLastEdited] = useState<"usd" | "mt">("mt")
  const [method, setMethod] = useState<PayMethod>("wallet")
  const [connecting, setConnecting] = useState(false)
  const [wallet, setWallet] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [reference] = useState(() => `COPTT-${Date.now().toString(36).toUpperCase()}`)

  const usd = parseAmount(usdInput)
  const mt = parseAmount(mtInput)
  const valid = usd !== null && mt !== null && mt >= MIN_MT

  const onUsdChange = (value: string) => {
    setLastEdited("usd")
    setUsdInput(value)
    const n = parseAmount(value)
    setMtInput(n ? (n / priceMt).toFixed(4) : "")
  }

  const onMtChange = (value: string) => {
    setLastEdited("mt")
    setMtInput(value)
    const n = parseAmount(value)
    setUsdInput(n ? (n * priceMt).toFixed(2) : "")
  }

  useEffect(() => {
    if (lastEdited === "usd") {
      const n = parseAmount(usdInput)
      if (n) setMtInput((n / priceMt).toFixed(4))
    } else {
      const n = parseAmount(mtInput)
      if (n) setUsdInput((n * priceMt).toFixed(2))
    }
  }, [priceMt])

  const reset = useCallback(() => {
    setStep("amount")
    setMethod("wallet")
    setWallet(null)
    setSubmitting(false)
  }, [])

  const close = (next: boolean) => {
    setOpen(next)
    if (!next) reset()
  }

  const connectWallet = async () => {
    const provider = getProvider()
    if (!provider) {
      toast.error("No wallet detected. Install MetaMask to pay with a wallet.")
      return
    }
    setConnecting(true)
    try {
      const accs = (await provider.request({ method: "eth_requestAccounts" })) as string[]
      const addr = accs?.[0] ?? null
      if (!addr) {
        toast.error("No account selected.")
        return
      }
      setWallet(addr)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Wallet connection cancelled.")
    } finally {
      setConnecting(false)
    }
  }

  const confirm = async () => {
    if (!valid) return
    if (method === "wallet" && !wallet) {
      toast.error("Connect a wallet first.")
      return
    }
    setSubmitting(true)
    await new Promise((r) => setTimeout(r, 700))
    setSubmitting(false)
    setStep("done")
    toast.success(
      method === "wallet"
        ? `Investment of ${formatUsd(usd!)} recorded.`
        : `Bank transfer ${reference} recorded. We'll match it when funds arrive.`,
    )
  }

  const title = useMemo(() => {
    if (step === "amount") return "Invest in COPTT"
    if (step === "pay") return "Payment method"
    if (step === "confirm") return method === "wallet" ? "Pay with wallet" : "Bank transfer"
    return "Investment submitted"
  }, [step, method])

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border/80 bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Ready to invest?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              1 COPTT = 1 Mt copper · priced from the live index
            </p>
          </div>
          <Button
            size="lg"
            className="bg-[#B87333] text-white hover:bg-[#9A5B2E] sm:min-w-[10rem]"
            onClick={() => setOpen(true)}
          >
            Invest now
            <ArrowRightIcon />
          </Button>
        </div>
      </div>

      <Sheet open={open} onOpenChange={close}>
        <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
          <SheetHeader className="border-b">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>
              {step === "done"
                ? "You can close this panel."
                : "Minimum 1 Mt · 1 COPTT = 1 metric ton of copper"}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-5">
            {step === "amount" ? (
              <div className="space-y-5">
                <p className="text-xs text-muted-foreground">
                  Price {formatUsd(priceMt)} / Mt
                </p>
                <div className="space-y-2">
                  <Label htmlFor="invest-mt">Copper to purchase (Mt)</Label>
                  <Input
                    id="invest-mt"
                    inputMode="decimal"
                    value={mtInput}
                    onChange={(e) => onMtChange(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Equals {mt ? formatMt(mt) : "—"} COPTT
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invest-usd">Investment amount (USD)</Label>
                  <Input
                    id="invest-usd"
                    inputMode="decimal"
                    value={usdInput}
                    onChange={(e) => onUsdChange(e.target.value)}
                  />
                </div>
                {!valid ? (
                  <p className="text-xs text-destructive">Enter at least 1 Mt.</p>
                ) : null}
              </div>
            ) : null}

            {step === "pay" ? (
              <div className="space-y-3">
                <PayOption
                  selected={method === "wallet"}
                  onSelect={() => setMethod("wallet")}
                  icon={<WalletIcon className="size-4" />}
                  title="Wallet"
                  detail="Connect MetaMask and confirm the allocation."
                />
                <PayOption
                  selected={method === "bank"}
                  onSelect={() => setMethod("bank")}
                  icon={<LandmarkIcon className="size-4" />}
                  title="Bank transfer"
                  detail="Send a wire. We match it to your reference."
                />
              </div>
            ) : null}

            {step === "confirm" && method === "wallet" ? (
              <div className="space-y-4">
                <Summary usd={usd} mt={mt} />
                {wallet ? (
                  <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                    Connected{" "}
                    <span className="font-mono font-medium">
                      {wallet.slice(0, 6)}…{wallet.slice(-4)}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Connect a wallet to continue. We only open it when you click.
                  </p>
                )}
              </div>
            ) : null}

            {step === "confirm" && method === "bank" ? (
              <div className="space-y-4">
                <Summary usd={usd} mt={mt} />
                <dl className="divide-y rounded-lg border text-sm">
                  <BankRow label="Beneficiary" value="Toto Finance AG" />
                  <BankRow label="IBAN" value="CH93 0076 2011 6238 5295 7" />
                  <BankRow label="Bank" value="UBS Switzerland AG" />
                  <BankRow label="Reference" value={reference} />
                  <BankRow label="Amount" value={usd ? formatUsd(usd) : "—"} />
                </dl>
                <p className="text-xs text-muted-foreground">
                  Use the reference exactly so we can match your transfer.
                </p>
              </div>
            ) : null}

            {step === "done" ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <span className="flex size-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <CheckIcon className="size-5" />
                </span>
                <p className="text-sm font-semibold">
                  {method === "wallet" ? "Wallet payment recorded" : "Transfer instructions saved"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatUsd(usd ?? 0)} for {formatMt(mt ?? 0)} Mt COPTT
                  {method === "bank" ? ` · ${reference}` : ""}
                </p>
              </div>
            ) : null}
          </div>

          <SheetFooter className="border-t">
            {step === "amount" ? (
              <Button
                className="bg-[#B87333] text-white hover:bg-[#9A5B2E]"
                disabled={!valid}
                onClick={() => setStep("pay")}
              >
                Continue
              </Button>
            ) : null}
            {step === "pay" ? (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setStep("amount")}>
                  Back
                </Button>
                <Button
                  className="bg-[#B87333] text-white hover:bg-[#9A5B2E]"
                  onClick={() => setStep("confirm")}
                >
                  Continue
                </Button>
              </div>
            ) : null}
            {step === "confirm" ? (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setStep("pay")}>
                  Back
                </Button>
                {method === "wallet" && !wallet ? (
                  <Button
                    className="bg-[#B87333] text-white hover:bg-[#9A5B2E]"
                    onClick={connectWallet}
                    disabled={connecting}
                  >
                    {connecting ? <Loader2Icon className="animate-spin" /> : <WalletIcon />}
                    Connect wallet
                  </Button>
                ) : (
                  <Button
                    className="bg-[#B87333] text-white hover:bg-[#9A5B2E]"
                    onClick={confirm}
                    disabled={submitting}
                  >
                    {submitting ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
                    {method === "wallet" ? "Confirm payment" : "I've sent the wire"}
                  </Button>
                )}
              </div>
            ) : null}
            {step === "done" ? (
              <Button variant="outline" onClick={() => close(false)}>
                Close
              </Button>
            ) : null}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}

function Summary({ usd, mt }: { usd: number | null; mt: number | null }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-3 text-sm">
      <p className="font-semibold tabular-nums">{usd ? formatUsd(usd) : "—"}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {mt ? `${formatMt(mt)} Mt · ${formatMt(mt)} COPTT` : "—"}
      </p>
    </div>
  )
}

function PayOption({
  selected,
  onSelect,
  icon,
  title,
  detail,
}: {
  selected: boolean
  onSelect: () => void
  icon: React.ReactNode
  title: string
  detail: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors",
        selected
          ? "border-[#B87333]/50 bg-amber-50/60 dark:bg-amber-950/20"
          : "hover:bg-muted/50",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border",
          selected ? "border-[#B87333]/40 text-[#9A5B2E]" : "text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{detail}</span>
      </span>
    </button>
  )
}

function BankRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-3 py-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium tabular-nums">{value}</dd>
    </div>
  )
}
