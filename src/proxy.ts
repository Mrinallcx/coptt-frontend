// Next.js proxy — runs before any route renders. (Renamed from
// middleware.ts in Next 16; the export name stays for back-compat.)
//
// Job: when an unauthenticated visitor hits a protected page, redirect
// them to /login?from=<original> so we can bounce them back after
// they log in. Protection is by *cookie presence only*; we don't validate
// the JWT here (the backend does that on every API call anyway, and the
// cookie's purpose is just to gate page rendering).
//
// Authenticated visitors who land on auth pages while already logged in
// get bounced to /dashboard (avoids the "I'm signed in, why is the
// sign-in form rendering" UX bug).

import { NextResponse, type NextRequest } from "next/server";
import { DEV_BYPASS_AUTH } from "@/lib/dev-bypass-auth";

// Must match the HttpOnly cookie written by the Go auth backend.
const AUTH_COOKIE_NAME = "coptt_at";
const SESSION_COOKIE_NAME = "coptt_session";

// Page-level groups proxy cares about. Anything not in these lists is
// treated as public — `/auth/verify`, `/auth/forgot-password` etc. need
// to be reachable while signed out for their links to work.
const PROTECTED_PREFIXES = ["/dashboard", "/investments", "/settings", "/kyc", "/offers"];
const AUTH_PREFIXES = ["/login", "/signup"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (DEV_BYPASS_AUTH) {
    if (AUTH_PREFIXES.some((p) => pathname.startsWith(p))) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // The marker keeps page navigation alive while the short access cookie is
  // being refreshed. It is not authorization; every API route validates the
  // signed HttpOnly token and its DB session.
  const hasAuth =
    req.cookies.get(AUTH_COOKIE_NAME)?.value ||
    req.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) && !hasAuth) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    // Round-trip the original path so the login handler can bounce back.
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  if (AUTH_PREFIXES.some((p) => pathname.startsWith(p)) && hasAuth) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Tell Next.js which paths to run middleware on. Anything ending in a
// static asset (svg, png, ico, etc.) is excluded so we don't waste a
// middleware invocation on every image request.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|css|js)$).*)",
  ],
};
