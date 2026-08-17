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

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import {
  CircleDollarSignIcon,
  Loader2Icon,
  WalletIcon,
  CheckIcon,
  ExternalLinkIcon,
  AlertTriangleIcon,
} from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

import { useAuth } from "@/contexts/auth-context"
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
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on?: (event: string, handler: (...args: unknown[]) => void) => void
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void
}

declare global {
  interface Window {
    ethereum?: EthereumProvider
  }
}

function getProvider(): EthereumProvider | null {
  if (typeof window === "undefined") return null
  return window.ethereum ?? null
}

function short(addr: string) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : ""
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
    let cancelled = false
    copttApi
      .getConfig()
      .then((cfg) => {
        if (!cancelled) setServerConfig(cfg)
      })
      .catch((err) => console.error("coptt config probe failed", err))
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!accessToken) {
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
          console.error("wallet probe failed", err)
        }
      } finally {
        if (!cancelled) setServerChecked(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [accessToken])

  // ---- Provider event wiring -------------------------------------------
  // MetaMask fires accountsChanged when the user switches account; we
  // mirror that into state so the "switch the connected account back to
  // the bound one" hint can render.
  useEffect(() => {
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

    // Sync once on mount.
    void (async () => {
      try {
        const accs = (await provider.request({ method: "eth_accounts" })) as string[]
        setBrowserAccount(accs?.[0]?.toLowerCase() ?? null)
        const cid = (await provider.request({ method: "eth_chainId" })) as string
        setChainOk(cid?.toLowerCase() === TARGET_CHAIN_ID_HEX)
      } catch (err) {
        console.error("initial provider probe failed", err)
      }
    })()

    return () => {
      provider.removeListener?.("accountsChanged", onAccounts)
      provider.removeListener?.("chainChanged", onChain)
    }
  }, [])

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

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <CircleDollarSignIcon className="size-4" />
          Buy COPTT
        </CardTitle>
        <CardDescription>
          Mint COPTT on Sepolia. Testnet — no payment. 1 COPTT = 1 lb of copper.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ---- Status row: KYC + Wallet badges --------------------- */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant={kycApproved ? "default" : "outline"} className="gap-1">
            {kycApproved ? <CheckIcon className="size-3" /> : <AlertTriangleIcon className="size-3" />}
            KYC {kycApproved ? "approved" : user?.kyc_status ?? "not started"}
          </Badge>
          <Badge variant={walletBound ? "default" : "outline"} className="gap-1">
            <WalletIcon className="size-3" />
            {walletBound ? `Wallet ${short(serverWallet!.address)}` : "Wallet not bound"}
          </Badge>
          <Badge variant={chainOk ? "secondary" : "outline"} className="gap-1">
            {TARGET_CHAIN_NAME}
            {chainOk ? <CheckIcon className="size-3" /> : null}
          </Badge>
        </div>

        {kycRequired && !kycApproved ? (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
            <p className="font-medium">Complete KYC to buy COPTT</p>
            <p className="text-muted-foreground text-xs mt-1">
              We&apos;re required to verify every investor before any token can be minted.
            </p>
            <Button size="sm" variant="outline" className="mt-2" render={<Link href="/kyc" />}>
              Start KYC
            </Button>
          </div>
        ) : null}

        {!kycRequired && !kycApproved ? (
          <div className="rounded-md border border-dashed border-amber-500/40 bg-amber-500/5 p-2 text-xs text-muted-foreground">
            <span className="font-medium">Dev mode:</span> KYC gate is disabled on this
            environment. Mint is open to any logged-in user with a bound wallet.
          </div>
        ) : null}

        <Separator />

        {/* ---- Wallet step ---------------------------------------- */}
        {!hasProvider ? (
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <p className="font-medium">MetaMask not detected</p>
            <p className="text-muted-foreground text-xs mt-1">
              Install the MetaMask browser extension and reload to bind your wallet.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              render={
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noreferrer noopener"
                />
              }
            >
              Get MetaMask <ExternalLinkIcon className="size-3" />
            </Button>
          </div>
        ) : !walletBound ? (
          <div className="space-y-3">
            <div className="text-sm">
              <p className="font-medium">Step 1 — Connect & bind wallet</p>
              <p className="text-muted-foreground text-xs mt-1">
                You&apos;ll sign a short message to prove you own this address. No transaction is
                sent, no gas is paid.
              </p>
            </div>

            {!browserAccount ? (
              <Button size="sm" onClick={connect} disabled={connecting}>
                {connecting ? <Loader2Icon className="animate-spin" /> : <WalletIcon />}
                Connect MetaMask
              </Button>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-muted-foreground">
                  Connected as <span className="font-mono">{short(browserAccount)}</span>
                  {!chainOk ? (
                    <span className="ml-2 text-amber-500">
                      — switch to {TARGET_CHAIN_NAME}
                    </span>
                  ) : null}
                </div>
                <Button
                  size="sm"
                  onClick={bind}
                  disabled={binding || !chainOk}
                >
                  {binding ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
                  Sign & bind
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm">
              <p className="font-medium flex items-center gap-1.5">
                <CheckIcon className="size-3.5 text-emerald-500" />
                Wallet bound
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                <span className="font-mono">{serverWallet?.address}</span>
              </p>
            </div>
            {!accountMatchesServer && browserAccount ? (
              <p className="text-xs text-amber-500">
                MetaMask is on a different account ({short(browserAccount)}). Mints still go to
                the bound address; switch in MetaMask if you want them to match.
              </p>
            ) : null}
          </div>
        )}

        {/* ---- Mint step ------------------------------------------ */}
        {walletBound ? (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="text-sm">
                <p className="font-medium">Step 2 — Mint COPTT</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Tokens are minted directly to your bound wallet. Sepolia testnet only.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Label htmlFor="amount" className="text-xs text-muted-foreground">
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
                  />
                </div>
                <Button
                  size="sm"
                  onClick={mint}
                  disabled={!canMintKyc || minting}
                >
                  {minting ? <Loader2Icon className="animate-spin" /> : <CircleDollarSignIcon />}
                  Mint
                </Button>
              </div>
              {lastMintTx ? (
                <p className="text-xs text-muted-foreground">
                  Last tx:{" "}
                  <a
                    className="underline font-mono"
                    href={`https://sepolia.etherscan.io/tx/${lastMintTx}`}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {short(lastMintTx)}
                  </a>
                </p>
              ) : null}
            </div>
          </>
        ) : null}

        {/* Loading shimmer for the very first probe */}
        {!serverChecked ? (
          <p className="text-xs text-muted-foreground">Checking wallet status…</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
