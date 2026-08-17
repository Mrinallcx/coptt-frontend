@AGENTS.md

# coptt-frontend

Next.js 16 (App Router) + React 19 + shadcn/ui (Base UI primitives) +
Tailwind v4. The COPTT investor portal frontend.

Pairs with `coptt-auth-backend` (Go API on `:8081`).

Active branch: **`coptt-investment-portal-new-ui-shadcn`** — the new
design. Don't merge until KYC visual review is signed off.

---

## Run it

```bash
npm install       # or pnpm install
npm run dev       # next dev → http://localhost:3000

# Detached + survives shell resets:
nohup npm run dev > /tmp/coptt-frontend.log 2>&1 &
disown
```

Backend must be on `:8081`. `.env.local` sets `NEXT_PUBLIC_API_URL`.

## Layout

```
src/
├── app/                      Next.js routes (App Router)
│   ├── page.tsx              → redirects to /dashboard
│   ├── layout.tsx            ROOT: wraps with AuthProvider + Toaster
│   ├── login/                ← shadcn login-01 block (wired)
│   ├── signup/               ← shadcn signup-01 block (wired)
│   ├── auth/{verify,forgot-password,reset-password}/   own pages, shadcn style
│   ├── dashboard/, investments/, settings/             pre-existing pages
│   └── kyc/                  KYC page hosting LCX widget
├── components/
│   ├── ui/                   shadcn primitives — DON'T edit by hand; re-run shadcn add
│   ├── login-form.tsx        shadcn block, our onSubmit attached
│   ├── signup-form.tsx       shadcn block, our onSubmit attached
│   ├── kyc-flow.tsx          LCX widget host + terminal-state cards
│   ├── app-sidebar.tsx       reads user from useAuth(), data nav-items hardcoded
│   ├── nav-user.tsx          logout wired
│   └── settings-content.tsx  KYC card sources status from useAuth, button → /kyc
├── contexts/auth-context.tsx AuthProvider, useAuth() hook, token persistence
├── lib/
│   ├── api.ts                authApi + kycApi + ApiRequestError
│   └── auth-storage.ts       localStorage + cookie in lockstep
├── proxy.ts                  middleware renamed proxy in Next 16; route guard
└── types/lcx-widget.d.ts     ambient `window.KYCWidget`
```

## Route protection (`src/proxy.ts`)

- Unauthenticated visitor on `/dashboard`, `/investments`, `/settings`, `/kyc`
  → `307 → /login?from=<original>`
- Authenticated visitor on `/login`, `/signup`
  → `307 → /dashboard`
- Cookie `coptt_at` is the auth signal (set by `auth-storage.writeTokens`)

## Integrations

| What | Where | Status |
|---|---|---|
| Backend API | `NEXT_PUBLIC_API_URL=http://localhost:8081` | live |
| LCX KYC widget | `src/components/kyc-flow.tsx` mounts `kyc-widget.js` + `.css` from `https://kyc-widget.lcx.com` | live |
| Sonner toasts | `<Toaster />` in `app/layout.tsx` | live |
| Google sign-in button | both auth forms show it; `onClick` → toast "coming soon" | not wired |

## Key flows

**Sign up → verify → sign in**: `/signup` (form POST `/auth/register`) → success card with dev verification URL (only shown when backend `ENV!=production`) → click link → `/auth/verify` (POST `/auth/verify-email`) → `/login`.

**Forgot password**: `/auth/forgot-password` (POST `/auth/forgot-password`, always returns 200 to prevent enumeration) → success card with optional dev reset URL → `/auth/reset-password?token=...` → POST `/auth/reset-password` (backend nukes all sessions) → `/login`.

**KYC**: `/settings` → **Start KYC Verification** button → `/kyc` page →
`kyc-flow.tsx` calls `POST /kyc/session` → loads `kyc-widget.js` + `.css`
→ `KYCWidget.init({ containerId, sessionToken, apiUrl, theme, onComplete, onError })`.
Status comes from `GET /kyc/status` (polled every 15s while `pending_review`).
Verdict arrives via backend webhook → polling reflects it.

## Gotchas

- **Next 16 renamed `middleware.ts` → `proxy.ts`** with `export function proxy`. Don't rename back.
- **`useSearchParams()` is nullable** in Next 16 — always use `params?.get(...)`.
- **Button has no `asChild`** on this branch (Base UI primitive). Use `render={<Link href="..." />}` instead.
- **`NEXT_PUBLIC_API_URL`** changes require a dev server restart (env baked at boot).
- **Backend's `APP_URL` must match the frontend host** (port-aware). Today: `http://localhost:3000`. If you ever switch frontend ports, update `coptt-auth-backend/.env`.
- **shadcn blocks** (`login-01`, `signup-01`) ship vanilla — we wire `onSubmit` + state without touching markup. Don't fight the block; re-run `npx shadcn@latest add ... --overwrite` if you need to refresh.
- **Logout** in `nav-user.tsx` redirects to `/login`. Don't change without updating proxy `AUTH_PREFIXES`.
- **`kyc.lcx.com` ≠ `kyc-widget.lcx.com`**. Former is LCX's internal dashboard (behind SSO); latter is the public widget host. Backend returns `widget_base_url` pointing at the right one.

## Typecheck

```bash
npx tsc --noEmit -p tsconfig.json
```

No separate lint step beyond `npm run lint`. CI hasn't been wired yet.

## Pending UI work

- **Forgot/reset password** — using own pages. shadcn doesn't ship blocks for these yet (`forgot-password-01` 404s in registry). Style is consistent with the rest.
- **Admin dashboard** — none on this branch yet. Old branch had `/admin/kyc/*`; we use LCX's own dashboard for now.
- **KYC entry in sidebar** — only via `/settings` today. Add to `data.navMain` in `app-sidebar.tsx` if product wants a top-level item.
- **Real avatars** — `nav-user.tsx` uses `user.picture` from backend. Backend never sets it. Either populate (OAuth flow later) or hide.
- **Email domain** — backend sends from `noreply@totofinance.co`. If product wants a different sender, update `EMAIL_FROM` in backend `.env`.
