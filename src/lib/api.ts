// Backend API client.
//
// Single fetch wrapper that:
//   - prefixes NEXT_PUBLIC_API_URL
//   - sets Content-Type: application/json
//   - throws ApiRequestError on non-2xx so call sites can branch on status
//   - parses the {error, message} envelope the backend returns
//
// No external deps — native fetch is fine for this scale. We don't use
// React Query because the new branch doesn't pull it in and most auth
// calls are one-shot anyway.

// Staging/prod default: same-origin /backend (Next rewrite → Go API).
// Local dev: set NEXT_PUBLIC_API_URL=http://localhost:8081 in .env.local.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/backend";

// --- Auth types (mirror backend responses) ---

export type UserRole = "user" | "admin";

export type KYCStatus =
  | "none"
  | "in_progress"
  | "pending_review"
  | "approved"
  | "rejected"
  | "expired";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  picture: string;
  /** ISO 3166-1 alpha-2 country code (e.g. "DE", "IN"). Empty for users
   *  created before this field existed. */
  country?: string;
  email_verified: boolean;
  role: UserRole;
  kyc_status: KYCStatus;
  totp_enabled?: boolean;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number;
  user: UserProfile;
}

export interface TwoFactorChallenge {
  requires_2fa: true;
  temp_token: string;
  token_type: "Bearer";
  expires_in: number;
}

export interface TOTPSetupResponse {
  otpauth_url: string;
  qr_png_base64: string;
  secret: string;
  issuer: string;
}

export function isTwoFactorChallenge(
  value: AuthResponse | TwoFactorChallenge,
): value is TwoFactorChallenge {
  return "requires_2fa" in value && value.requires_2fa === true;
}

export interface RegisterResponse {
  message: string;
  /** Only present when backend ENV != "production" — dev convenience. */
  verification_url?: string;
}

export interface ForgotPasswordResponse {
  message: string;
  /** Dev mode only, when the email matched a real user. */
  reset_url?: string;
}

export interface ApiError {
  error: string;
  message?: string;
  kyc_status?: KYCStatus;
}

// --- Error type ---

/**
 * Thrown by request() on any non-2xx response. Preserves the HTTP status
 * and the backend's {error, message} envelope so call sites can branch on
 * status (e.g. show 401 differently from 429) or read the machine-readable
 * `error` code (e.g. "kyc_required", "checklist_required").
 */
export class ApiRequestError extends Error {
  status: number;
  error: string;
  backendMessage?: string;
  retryAfterSeconds?: number;
  kycStatus?: KYCStatus;

  constructor(status: number, payload: ApiError, retryAfterSeconds?: number) {
    super(payload.message || payload.error || `HTTP ${status}`);
    this.name = "ApiRequestError";
    this.status = status;
    this.error = payload.error ?? "request_failed";
    this.backendMessage = payload.message;
    this.retryAfterSeconds = retryAfterSeconds;
    this.kycStatus = payload.kyc_status;
  }
}

// --- Core helpers ---

let refreshInFlight: Promise<boolean> | null = null;

function mayRefresh(path: string): boolean {
  return [
    "/auth/me",
    "/auth/logout",
    "/auth/2fa/setup",
    "/auth/2fa/verify-setup",
    "/auth/2fa/disable",
    "/kyc/",
    "/wallets/",
    "/coptt/mint",
    "/admin/",
    "/invest/",
  ].some((prefix) => path.startsWith(prefix));
}

async function refreshCookieSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: "{}",
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  allowRefresh = true,
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) ?? {}),
  };

  let res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  if (
    res.status === 401 &&
    allowRefresh &&
    mayRefresh(path) &&
    (await refreshCookieSession())
  ) {
    res = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });
  }

  if (!res.ok) {
    const payload: ApiError = await res
      .json()
      .catch(() => ({ error: "request_failed" }));
    const retryAfterHeader = res.headers.get("Retry-After");
    const retryAfter = retryAfterHeader
      ? Number.parseInt(retryAfterHeader, 10) || undefined
      : undefined;
    throw new ApiRequestError(res.status, payload, retryAfter);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

function authed(_token: string, init: RequestInit = {}): RequestInit {
  // Production access tokens live only in an HttpOnly cookie.
  return init;
}

function bearer(token: string, init: RequestInit = {}): RequestInit {
  return {
    ...init,
    headers: {
      ...((init.headers as Record<string, string>) ?? {}),
      Authorization: `Bearer ${token}`,
    },
  };
}

// --- Auth API ---

export const authApi = {
  register(
    email: string,
    password: string,
    name: string,
    country?: string,
  ) {
    const body: Record<string, string> = { email, password, name };
    if (country) body.country = country;
    return request<RegisterResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  login(email: string, password: string) {
    return request<AuthResponse | TwoFactorChallenge>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

	setup2FA(accessToken: string, password: string) {
    return request<TOTPSetupResponse>(
      "/auth/2fa/setup",
      authed(accessToken, {
        method: "POST",
        body: JSON.stringify({ password }),
      }),
    );
  },

  verify2FASetup(accessToken: string, code: string) {
    return request<UserProfile>(
      "/auth/2fa/verify-setup",
      authed(accessToken, {
        method: "POST",
        body: JSON.stringify({ code }),
      }),
    );
  },

  verify2FALogin(tempToken: string, code: string) {
    return request<AuthResponse>(
      "/auth/2fa/verify",
      bearer(tempToken, {
        method: "POST",
        body: JSON.stringify({ code }),
      }),
    );
  },

  disable2FA(accessToken: string, code: string, password: string) {
    return request<UserProfile>(
      "/auth/2fa/disable",
      authed(accessToken, {
        method: "POST",
        body: JSON.stringify({ code, password }),
      }),
    );
  },

  verifyEmail(token: string) {
    const qs = new URLSearchParams({ token }).toString();
    return request<{ message: string }>(`/auth/verify-email?${qs}`);
  },

  refreshToken(refreshToken = "") {
    return request<AuthResponse>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify(refreshToken ? { refresh_token: refreshToken } : {}),
    });
  },

  getProfile(accessToken: string) {
    return request<UserProfile>("/auth/me", authed(accessToken));
  },

  logout(accessToken: string) {
    return request<{ message: string }>(
      "/auth/logout",
      authed(accessToken, { method: "POST" }),
    );
  },

  forgotPassword(email: string) {
    return request<ForgotPasswordResponse>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  resetPassword(token: string, newPassword: string) {
    return request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, new_password: newPassword }),
    });
  },
};

// --- KYC types ---

export interface KYCDocument {
  id: string;
  doc_type: string;
  mime_type: string;
  size_bytes: number;
  upload_confirmed: boolean;
  uploaded_at: string;
}

export interface KYCStatusResponse {
  status: KYCStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  expires_at: string | null;
  rejection_reason: string;
  country: string;
  documents: KYCDocument[];
}

/** Response from `POST /kyc/session` (LCX). The widget consumes session_token. */
export interface VendorSessionResponse {
  /** Short-lived JWT (~30 min) passed to KYCWidget.init({ sessionToken }). */
  session_token: string;
  expires_in: number;
  applicant_id: string;
  applicant_status: string;
  /** CDN host: `${widget_base_url}/kyc-widget.js` + `${widget_base_url}/kyc-widget.css`. */
  widget_base_url: string;
}

// --- KYC API ---

export const kycApi = {
  /** Current status of the caller's KYC profile. */
  getStatus(accessToken: string) {
    return request<KYCStatusResponse>("/kyc/status", authed(accessToken));
  },

  /**
   * Mint a fresh hosted-vendor (LCX) widget session. Backend proxies to
   * LCX with our server-side API key and returns the short-lived JWT the
   * widget consumes plus the CDN base URL. 503 if LCX_API_KEY isn't set.
   */
  createVendorSession(accessToken: string) {
    return request<VendorSessionResponse>(
      "/kyc/session",
      authed(accessToken, { method: "POST" }),
    );
  },
};

// --- COPTT (token-specific endpoints) ---

/** Response from `GET /coptt/price`. Source distinguishes live Pyth from mock. */
export interface CopperPrice {
  usd_per_lb: number;
  /** ± USD confidence interval from Pyth. 0 / missing for mock. */
  confidence?: number;
  publish_time: string; // ISO8601
  source: "pyth_lazer" | "mock";
  fetched_at: string;   // ISO8601
  /** True if the cache served a stale value because a refresh failed. */
  stale?: boolean;
  feed_symbol?: string;
}

/** One point in the recorded price series. `t` is the bucket timestamp. */
export interface CopperPricePoint {
  t: string; // ISO8601
  usd_per_lb: number;
}

/** Windows `GET /coptt/price/history` accepts. */
export type CopperPriceRange = "24h" | "7d" | "30d" | "90d" | "1y";

/**
 * Response from `GET /coptt/price/history`.
 *
 * The upstream feed publishes only the current price, so this series is
 * built from samples the backend has taken since it was first deployed:
 * an empty `points` array is a normal answer, not a failure. `sources`
 * says whether the series came from the live feed or the dev mock.
 */
export interface CopperPriceHistory {
  range: CopperPriceRange;
  bucket_seconds: number;
  from: string; // ISO8601
  to: string;   // ISO8601
  points: CopperPricePoint[];
  count: number;
  sources: Array<"pyth_lazer" | "mock"> | null;
}

/**
 * Server-side mint settings the UI mirrors. Same shape as GET /coptt/config.
 * `require_kyc_for_mint` defaults true on the server (safe). Dev / staging
 * deployments flip it to false to skip the KYC gate during testing.
 */
export interface CopttServerConfig {
  require_kyc_for_mint: boolean;
  mint_enabled: boolean;
  chain_id: number;
  contract?: string;
}

export const copttApi = {
  /**
   * Current copper price per pound, USD. Public (no auth required).
   * Backend caches for 60s so this is safe to call from every render.
   */
  getPrice() {
    return request<CopperPrice>("/coptt/price");
  },

  /**
   * Recorded price series for the chart. Public (no auth required).
   * Coarser ranges come back pre-bucketed, so a response is at most a
   * few hundred points regardless of window.
   */
  getPriceHistory(range: CopperPriceRange = "7d") {
    return request<CopperPriceHistory>(
      `/coptt/price/history?range=${encodeURIComponent(range)}`,
    );
  },

  /**
   * Public server config — chain id, contract, and whether the KYC gate
   * is on. The UI uses `require_kyc_for_mint` to decide whether to
   * disable the Mint button when the user is unverified.
   */
  getConfig() {
    return request<CopttServerConfig>("/coptt/config");
  },

  /**
   * Mint COPTT to the caller's bound wallet. Auth + approved-KYC +
   * bound-wallet gated. Testnet only — no payment step.
   *
   * Failure modes the UI should branch on:
   *   - 401 unauthorized           — not logged in
   *   - 403 kyc_required           — KYC not approved
   *   - 400 wallet_not_bound       — wallet binding missing
   *   - 503 chain_not_configured   — backend RPC/key not set
   *   - 502 mint_failed            — on-chain revert / RPC failure
   */
  mint(accessToken: string, amountLbs: number) {
    return request<{
      tx_hash: string;
      block_number: number;
      amount_lbs: number;
      amount_wei: string;
      wallet: string;
      contract: string;
    }>(
      "/coptt/mint",
      authed(accessToken, {
        method: "POST",
        body: JSON.stringify({ amount_lbs: amountLbs }),
      }),
    );
  },
};

// --- Wallet binding (MetaMask) -------------------------------------------

/** Response from `GET /wallets/me`. 404 → user has no wallet at all. */
export interface WalletInfo {
  address: string;
  bound_at: string | null;
  bound: boolean;
}

/** Response from `POST /wallets/challenge`. Sign `message` in MetaMask. */
export interface WalletChallenge {
  message: string;
  nonce: string;
}

export const walletApi = {
  /** 404s when the user has never even requested a challenge. */
  getMine(accessToken: string) {
    return request<WalletInfo>("/wallets/me", authed(accessToken));
  },

  /** Mint a fresh nonce + canonical message for personal_sign. */
  createChallenge(accessToken: string) {
    return request<WalletChallenge>(
      "/wallets/challenge",
      authed(accessToken, { method: "POST" }),
    );
  },

  /** Submit the signed challenge to bind the wallet. */
  bind(accessToken: string, address: string, signature: string) {
    return request<{ address: string; bound: boolean }>(
      "/wallets/bind",
      authed(accessToken, {
        method: "POST",
        body: JSON.stringify({ address, signature }),
      }),
    );
  },
};

