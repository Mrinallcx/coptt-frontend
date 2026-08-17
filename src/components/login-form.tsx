"use client"

// Shadcn login-01 form, wired to our backend.
//
// Design rule: do NOT touch the markup the shadcn block ships beyond the
// minimal additions. We add state + an onSubmit handler, swap the Sign-up
// link target, and slot a tiny error banner above the form. The "Login
// with Google" button was removed per product direction (OAuth isn't on
// the roadmap right now).

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2Icon, CircleAlertIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { ApiRequestError, authApi } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const params = useSearchParams()
  // /login is the destination middleware sends unauthenticated visitors to.
  // It encodes the original path so we can bounce back after a successful login.
  const redirectTo = params?.get("from") || "/dashboard"

  const { login } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const data = new FormData(e.currentTarget)
    const email = String(data.get("email") || "").trim()
    const password = String(data.get("password") || "")
    if (!email || !password) {
      setError("Email and password are required.")
      return
    }
    setBusy(true)
    try {
      const resp = await authApi.login(email, password)
      login(resp)
      toast.success("Welcome back")
      router.replace(redirectTo)
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.status === 401) setError("Invalid email or password.")
        else if (err.status === 403) setError(err.backendMessage || "Please verify your email before signing in.")
        else if (err.status === 429) {
          const m = err.retryAfterSeconds ? Math.ceil(err.retryAfterSeconds / 60) : null
          setError(m ? `Too many attempts. Try again in about ${m} minute${m === 1 ? "" : "s"}.` : "Too many attempts. Try again later.")
        } else setError(err.backendMessage || err.message)
      } else {
        setError(err instanceof Error ? err.message : "Sign in failed.")
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
              <CircleAlertIcon className="size-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <form onSubmit={onSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  autoComplete="email"
                  required
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </Field>
              <Field>
                <Button type="submit" disabled={busy}>
                  {busy ? (
                    <>
                      <Loader2Icon className="animate-spin" />
                      Logging in…
                    </>
                  ) : (
                    "Login"
                  )}
                </Button>
                <FieldDescription className="text-center">
                  Don&apos;t have an account?{" "}
                  <Link href="/signup">Sign up</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
