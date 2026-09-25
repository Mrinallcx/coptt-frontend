"use client"

// Buy COPTT — the wallet + mint module that lives below the offer terms.
//
// Three-step UX, gated in order:
//
//   1. ConnectWallet      — MetaMask injected, eth_requestAccounts
//   2. SignChallenge/Bind — POST /wallets/challenge → personal_sign → POST /wallets/bind
//   3. Mint               — amount input → POST /coptt/mint (KYC-gated server-side)
//
// KYC is the hard gate — if the user's kyc_status !== 'approved', step 3
// is disabled and we point them at /kyc. The backend ALSO enforces the
// gate (RequireApprovedKYC middleware) so we never rely on the UI alone.
//
// We talk to MetaMask via `window.ethereum` directly — no wagmi / ethers
// dependency. The only calls we make are `eth_requestAccounts`,
// `eth_chainId`, `wallet_switchEthereumChain`, and `personal_sign`.

import { useCallback, useEffect, useState, type ReactNode } from "react"
import { toast } from "sonner"
import {
  CircleDollarSignIcon,
  Loader2Icon,
  WalletIcon,
  CheckIcon,
  ExternalLinkIcon,
  LockIcon,
} from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

import { useAuth } from "@/contexts/auth-context"
import { DEV_BYPASS_AUTH } from "@/lib/dev-bypass-auth"
import {
  ApiRequestError,
  copttApi,
  walletApi,
  type CopttServerConfig,
  type WalletInfo,
} from "@/lib/api"

// Sepolia. Mainnet = 1, Sepolia = 11155111. Keep in sync with backend
// COPTT_CHAIN_ID — if they diverge MetaMask will surface "wrong network".
const TARGET_CHAIN_ID_HEX = "0xaa36a7" // 11155111
const TARGET_CHAIN_NAME = "Sepolia"
const SEPOLIA_PARAMS = {
  chainId: TARGET_CHAIN_ID_HEX,
  chainName: "Sepolia",
  nativeCurrency: { name: "SepoliaETH", symbol: "SEP", decimals: 18 },
  rpcUrls: ["https://rpc.sepolia.org"],
  blockExplorerUrls: ["https://sepolia.etherscan.io"],
}

// --- window.ethereum shape we touch -------------------------------------
//
// MetaMask injects a richer EIP-1193 provider, but we only need request()
// and the chainChanged / accountsChanged events. Keep typing minimal so
// we don't pull in `@metamask/providers`.

interface EthereumProvider {
  isMetaMask?: boolean
  isPhantom?: boolean
  providers?: EthereumProvider[]
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on?: (event: string, handler: (...args: unknown[]) => void) => void
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void
}

declare global {
  interface Window {
    ethereum?: EthereumProvider
  }
}

function getInjectedProviders(): EthereumProvider[] {
  if (typeof window === "undefined") return []
  const eth = window.ethereum
  if (!eth) return []
  if (Array.isArray(eth.providers) && eth.providers.length > 0) {
    return eth.providers
  }
  return [eth]
}

// Prefer MetaMask. Phantom often claims window.ethereum (and spoofs
// isMetaMask), so talking to the default provider on page load pops
// Phantom. Never call request() until the user clicks Connect.
function getProvider(): EthereumProvider | null {
  const providers = getInjectedProviders()
  if (providers.length === 0) return null
  return (
    providers.find((p) => p.isMetaMask && !p.isPhantom) ??
    providers.find((p) => !p.isPhantom) ??
    providers[0]
  )
}

function short(addr: string) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : ""
}

const panel = "overflow-hidden rounded-xl border border-stone-200/90 bg-white shadow-sm"

type StepState = "complete" | "active" | "locked"

function RequirementStep({
  step,
  title,
  detail,
  state,
  isLast,
  children,
}: {
  step: number
  title: string
  detail?: string
  state: StepState
  isLast?: boolean
  children?: ReactNode
}) {
  return (
    <div
      className={cn(
        "relative grid grid-cols-[2rem_1fr] gap-x-4",
        !isLast && "pb-8",
        state === "locked" && "opacity-50",
      )}
    >
      {!isLast ? (
        <div
          className={cn(
            "absolute left-4 top-8 h-[calc(100%-1.25rem)] w-px -translate-x-1/2",
            state === "complete" ? "bg-stone-300" : "bg-stone-200",
          )}
          aria-hidden
        />
      ) : null}

      <div
        className={cn(
          "relative z-10 flex size-8 items-center justify-center rounded-full border text-xs font-semibold",
          state === "complete" &&
            "border-emerald-200 bg-emerald-50 text-emerald-800",
          state === "active" && "border-stone-800 bg-stone-900 text-white",
          state === "locked" && "border-stone-200 bg-stone-100 text-stone-400",
        )}
      >
        {state === "complete" ? (
          <CheckIcon className="size-3.5" />
        ) : state === "locked" ? (
          <LockIcon className="size-3" />
        ) : (
          step
        )}
      </div>

      <div className="min-w-0 pt-0.5">
        <p
          className={cn(
            "text-sm font-semibold tracking-tight",
            state === "active" ? "text-stone-950" : "text-stone-800",
          )}
        >
          {title}
        </p>
        {detail ? (
          <p className="mt-1 text-xs leading-relaxed text-stone-500">{detail}</p>
        ) : null}
        {state === "active" && children ? (
          <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50/80 p-4">
            {children}
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ---- Component ---------------------------------------------------------

export function BuyCopttCard() {
  const { user, accessToken } = useAuth()
  const kycApproved = user?.kyc_status === "approved"

  // Server config — fetched once on mount. While it's loading we
  // assume the gate IS on (the safer default). `kycRequired` is the
  // effective flag we use everywhere below; dev env can flip the
  // server-side env var to bypass.
  const [serverConfig, setServerConfig] = useState<CopttServerConfig | null>(null)
  const kycRequired = serverConfig?.require_kyc_for_mint ?? true
  const canMintKyc = !kycRequired || kycApproved

  // Wallet binding state — three sources of truth, kept in sync:
  //   serverWallet:    what the backend has bound to this user
  //   browserAccount:  what MetaMask currently exposes
  //   chainOk:         MetaMask is on Sepolia
  const [serverWallet, setServerWallet] = useState<WalletInfo | null>(null)
  const [serverChecked, setServerChecked] = useState(false)
  const [browserAccount, setBrowserAccount] = useState<string | null>(null)
  const [chainOk, setChainOk] = useState(false)
  const [hasProvider, setHasProvider] = useState(false)

  // Step-level busy flags so multiple buttons can't be hit concurrently.
  const [connecting, setConnecting] = useState(false)
  const [binding, setBinding] = useState(false)
  const [minting, setMinting] = useState(false)

  // Mint form state.
  const [amount, setAmount] = useState("1")
  const [lastMintTx, setLastMintTx] = useState<string | null>(null)

  // ---- Initial probe: provider present? wallet already on file? ----
  useEffect(() => {
    setHasProvider(!!getProvider())
  }, [])

  // Public server config: KYC gate status + chain id. Public endpoint
  // so we don't need to wait for auth.
  useEffect(() => {
    if (DEV_BYPASS_AUTH) {
      setServerConfig({
        require_kyc_for_mint: false,
        mint_enabled: true,
        chain_id: 11155111,
      })
      return
    }
    let cancelled = false
    copttApi
      .getConfig()
      .then((cfg) => {
        if (!cancelled) setServerConfig(cfg)
      })
      .catch(() => {
        /* backend unreachable — keep the safe KYC-on default */
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (DEV_BYPASS_AUTH || !accessToken) {
      setServerChecked(true)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const w = await walletApi.getMine(accessToken)
        if (!cancelled) setServerWallet(w)
      } catch (err) {
        // 404 = no wallet yet, that's the common case.
        if (!(err instanceof ApiRequestError && err.status === 404)) {
          /* ignore — mint stays locked until the user binds */
        }
      } finally {
        if (!cancelled) setServerChecked(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [accessToken])

  // Listen for account/chain changes only after the user has connected.
  // Probing eth_accounts / eth_chainId (or even attaching listeners) on
  // mount makes Phantom open as soon as "View offer" loads this card.
  useEffect(() => {
    if (!browserAccount) return
    const provider = getProvider()
    if (!provider?.on) return

    const onAccounts = (...args: unknown[]) => {
      const accs = (args[0] as string[]) ?? []
      setBrowserAccount(accs[0]?.toLowerCase() ?? null)
    }
    const onChain = (...args: unknown[]) => {
      const cid = (args[0] as string) ?? ""
      setChainOk(cid.toLowerCase() === TARGET_CHAIN_ID_HEX)
    }

    provider.on("accountsChanged", onAccounts)
    provider.on("chainChanged", onChain)

    return () => {
      provider.removeListener?.("accountsChanged", onAccounts)
      provider.removeListener?.("chainChanged", onChain)
    }
  }, [browserAccount])

  // ---- Connect: prompt MetaMask + switch chain if needed --------------
  const connect = useCallback(async () => {
    const provider = getProvider()
    if (!provider) {
      toast.error("MetaMask not detected — install it to continue.")
      return
    }
    setConnecting(true)
    try {
      const accs = (await provider.request({
        method: "eth_requestAccounts",
      })) as string[]
      const addr = accs?.[0]?.toLowerCase() ?? null
      setBrowserAccount(addr)

      // Switch to Sepolia. If MetaMask doesn't know about it (rare —
      // it's a default network now) we add it.
      const cid = (await provider.request({ method: "eth_chainId" })) as string
      if (cid?.toLowerCase() !== TARGET_CHAIN_ID_HEX) {
        try {
          await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: TARGET_CHAIN_ID_HEX }],
          })
        } catch (e) {
          // 4902 = unrecognized chain. Try adding it.
          const code = (e as { code?: number })?.code
          if (code === 4902) {
            await provider.request({
              method: "wallet_addEthereumChain",
              params: [SEPOLIA_PARAMS],
            })
          } else {
            throw e
          }
        }
        setChainOk(true)
      } else {
        setChainOk(true)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection failed"
      toast.error(msg)
    } finally {
      setConnecting(false)
    }
  }, [])

  // ---- Bind: challenge → personal_sign → /wallets/bind ----------------
  const bind = useCallback(async () => {
    if (!accessToken || !browserAccount) return
    const provider = getProvider()
    if (!provider) return

    setBinding(true)
    try {
      const challenge = await walletApi.createChallenge(accessToken)
      // personal_sign params: [message, address]. We pass the message as
      // a hex string OR utf8 — MetaMask accepts both; raw utf8 is what
      // the user sees in the popup, which is what we want.
      const signature = (await provider.request({
        method: "personal_sign",
        params: [challenge.message, browserAccount],
      })) as string

      const resp = await walletApi.bind(accessToken, browserAccount, signature)
      setServerWallet({
        address: resp.address,
        bound: resp.bound,
        bound_at: new Date().toISOString(),
      })
      toast.success("Wallet bound to your account.")
    } catch (err) {
      const msg =
        err instanceof ApiRequestError
          ? err.backendMessage ?? err.message
          : err instanceof Error
            ? err.message
            : "Binding failed"
      toast.error(msg)
    } finally {
      setBinding(false)
    }
  }, [accessToken, browserAccount])

  // ---- Mint: POST /coptt/mint -----------------------------------------
  const mint = useCallback(async () => {
    if (!accessToken) return
    const parsed = Number.parseFloat(amount)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Enter a positive amount.")
      return
    }
    setMinting(true)
    setLastMintTx(null)
    try {
      const result = await copttApi.mint(accessToken, parsed)
      setLastMintTx(result.tx_hash)
      toast.success(`Minted ${result.amount_lbs} COPTT to ${short(result.wallet)}`)
    } catch (err) {
      if (err instanceof ApiRequestError) {
        // Surface the backend's machine-readable error code so the user
        // knows which gate they hit (KYC vs wallet vs chain).
        const tag =
          err.error === "kyc_required"
            ? "KYC required"
            : err.error === "wallet_not_bound"
              ? "Wallet not bound"
              : err.error === "chain_not_configured"
                ? "Mint not configured on backend"
                : err.error === "mint_failed"
                  ? "Mint reverted on-chain"
                  : `Mint error (${err.status})`
        toast.error(`${tag}: ${err.backendMessage ?? err.message}`)
      } else {
        toast.error((err as Error).message ?? "Mint failed")
      }
    } finally {
      setMinting(false)
    }
  }, [accessToken, amount])

  // ---- Derived flags for render ---------------------------------------
  const walletBound = !!serverWallet?.bound
  // True when MetaMask is connected to the SAME address the backend has
  // on file. After a successful bind this is always true; useful when a
  // returning user opens MetaMask on a different account.
  const accountMatchesServer =
    !!browserAccount &&
    !!serverWallet?.address &&
    browserAccount.toLowerCase() === serverWallet.address.toLowerCase()

  // ---- Render ----------------------------------------------------------

  const kycDone = !kycRequired || kycApproved
  const kycDetail = kycDone
    ? "Identity verified — you may proceed."
    : "Required before any token can be minted."

  const walletDetail = walletBound
    ? serverWallet?.address
    : kycDone
      ? hasProvider
        ? "Connect MetaMask on Sepolia and sign to bind."
        : "Install MetaMask to continue."
      : "Unlocked after identity verification."

  const activeStep: 1 | 2 | 3 = !kycDone ? 1 : !walletBound ? 2 : 3

  function stepState(step: 1 | 2 | 3): StepState {
    if (step < activeStep) return "complete"
    if (step === activeStep) return "active"
    return "locked"
  }

  return (
    <div className={panel}>
      <div
        className="h-1 bg-gradient-to-r from-[#8B4513] via-[#B87333] to-[#D4956A]"
        aria-hidden
      />

      <div className="border-b border-stone-200 px-6 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
          Subscription
        </p>
        <h2 className="mt-1 font-heading text-xl font-semibold tracking-tight text-stone-950">
          Mint COPTT
        </h2>
        <p className="mt-2 text-sm text-stone-600">
          Sepolia testnet · 1 COPTT = 1 lb copper · No payment required
        </p>
      </div>

      <div className="px-6 py-6">
        {!kycRequired && !kycApproved ? (
          <p className="mb-6 rounded-lg border border-dashed border-stone-300 bg-stone-50 px-3 py-2 text-xs text-stone-600">
            Dev environment — KYC gate is disabled for minting.
          </p>
        ) : null}

        <RequirementStep
          step={1}
          title="Identity verification"
          detail={stepState(1) === "complete" ? "Verified" : kycDetail}
          state={stepState(1)}
        >
          <p className="text-sm text-stone-700">
            Regulatory compliance requires a verified investor profile before minting.
          </p>
          <Button
            className="mt-3 bg-stone-900 text-white hover:bg-stone-800"
            nativeButton={false}
            render={<Link href="/kyc" />}
          >
            Complete verification
          </Button>
        </RequirementStep>

        <RequirementStep
          step={2}
          title="Wallet binding"
          detail={
            stepState(2) === "complete"
              ? `Bound · ${short(serverWallet!.address)}`
              : walletDetail
          }
          state={stepState(2)}
        >
          {!hasProvider ? (
            <>
              <p className="text-sm text-stone-700">
                MetaMask is required. Install the extension, then reload this page.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 border-stone-300 bg-white"
                nativeButton={false}
                render={
                  <a
                    href="https://metamask.io/download/"
                    target="_blank"
                    rel="noreferrer noopener"
                  />
                }
              >
                Install MetaMask
                <ExternalLinkIcon className="size-3" />
              </Button>
            </>
          ) : !browserAccount ? (
            <>
              <p className="text-sm text-stone-700">
                Connect your wallet, then sign a message to bind it to your account.
                No transaction fee.
              </p>
              <Button
                className="mt-3 bg-stone-900 text-white hover:bg-stone-800"
                onClick={connect}
                disabled={connecting}
              >
                {connecting ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <WalletIcon />
                )}
                Connect MetaMask
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-stone-700">
                Connected{" "}
                <span className="font-mono font-medium">{short(browserAccount)}</span>
                {!chainOk ? (
                  <span className="text-amber-700">
                    {" "}
                    — please switch MetaMask to {TARGET_CHAIN_NAME}
                  </span>
                ) : null}
              </p>
              <Button
                className="mt-3 bg-stone-900 text-white hover:bg-stone-800"
                onClick={bind}
                disabled={binding || !chainOk}
              >
                {binding ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
                Sign & bind wallet
              </Button>
            </>
          )}
        </RequirementStep>

        <RequirementStep
          step={3}
          title="Mint allocation"
          detail={
            stepState(3) === "locked"
              ? "Available once your wallet is bound."
              : "Enter amount and mint to your bound wallet."
          }
          state={stepState(3)}
          isLast
        >
          {!accountMatchesServer && browserAccount ? (
            <p className="mb-3 text-xs text-amber-800">
              MetaMask is on {short(browserAccount)}. Tokens mint to your bound
              address.
            </p>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="amount" className="text-xs font-medium text-stone-600">
                Amount (lbs)
              </Label>
              <Input
                id="amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={!canMintKyc || minting}
                className="border-stone-300 bg-white"
              />
            </div>
            <Button
              className="bg-[#9A5B2E] text-white hover:bg-[#8B4A1E] sm:min-w-[7.5rem]"
              onClick={mint}
              disabled={!canMintKyc || minting}
            >
              {minting ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <CircleDollarSignIcon />
              )}
              Mint COPTT
            </Button>
          </div>
          {lastMintTx ? (
            <p className="mt-3 text-xs text-stone-500">
              Last transaction{" "}
              <a
                className="font-mono text-stone-700 underline underline-offset-2"
                href={`https://sepolia.etherscan.io/tx/${lastMintTx}`}
                target="_blank"
                rel="noreferrer noopener"
              >
                {short(lastMintTx)}
              </a>
            </p>
          ) : null}
        </RequirementStep>

        {!serverChecked ? (
          <p className="mt-4 text-xs text-stone-500">Checking account status…</p>
        ) : null}
      </div>
    </div>
  )
}
