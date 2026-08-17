// Auth token persistence — single source of truth for "where are tokens
// stored". They live in TWO places:
//
//   1. localStorage — read by client-side code (API client, auth context)
//   2. A cookie     — read by Next.js middleware (server-side request
//                     interception, so we can redirect unauthenticated
//                     traffic away from /dashboard etc. *before* React
//                     mounts and a flash of protected content can leak)
//
// We keep both in lockstep so signOut() wipes them together. The cookie is
// NOT httpOnly — it has to be readable from the same client that writes it,
// and JS doesn't have a way to read httpOnly cookies. That's OK here
// because the cookie carries the same access token that already lives in
// localStorage — neither layer is more secure than the other from XSS.
// The cookie is just middleware's window into the auth state.

const ACCESS_KEY = "coptt_access_token";
const REFRESH_KEY = "coptt_refresh_token";

// Name middleware checks. Short to keep request headers small. SameSite=Lax
// is safe for our flows (no cross-site POSTs that need the cookie).
const COOKIE_NAME = "coptt_at";

// Long enough to cover refresh-token TTL (7d on the backend). The access
// token rotates, but the cookie just signals "this user is authenticated";
// middleware does presence-check only, not validation.
const COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function setCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (!isBrowser()) return;
  // Path=/ so middleware sees the cookie on every protected route.
  // Secure flag intentionally omitted — dev runs over http://localhost.
  // For production set Secure via a global flag if behind HTTPS.
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax`;
}

function clearCookie(name: string): void {
  if (!isBrowser()) return;
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
}

export function readTokens(): { accessToken: string | null; refreshToken: string | null } {
  if (!isBrowser()) return { accessToken: null, refreshToken: null };
  return {
    accessToken: localStorage.getItem(ACCESS_KEY),
    refreshToken: localStorage.getItem(REFRESH_KEY),
  };
}

export function writeTokens(accessToken: string, refreshToken: string): void {
  if (!isBrowser()) return;
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  setCookie(COOKIE_NAME, accessToken, COOKIE_MAX_AGE_SECONDS);
}

export function clearTokens(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  clearCookie(COOKIE_NAME);
}

// Exported so middleware can reference the same name. Keep this the single
// source of truth.
export const AUTH_COOKIE_NAME = COOKIE_NAME;
