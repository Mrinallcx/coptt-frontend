"use client"

// Shadcn signup-01 form, wired to our backend.
//
// Markup matches the shadcn block exactly. On success we DON'T auto-sign-in
// — backend requires email verification first. We swap the form for a
// success card pointing the user at their inbox.

import { useState, type FormEvent } from "react"
import Link from "next/link"
import {
  CheckCircle2Icon,
  CircleAlertIcon,
  Loader2Icon,
} from "lucide-react"

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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { ApiRequestError, authApi } from "@/lib/api"
import { sortedCountries } from "@/lib/countries"

interface SuccessState {
  email: string
}

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState<SuccessState | null>(null)
  // Country is the only controlled input — Base UI's Select renders a
  // button trigger, not a form-bound element, so FormData won't see it.
  // The other fields stay uncontrolled and we read them via FormData.
  const [country, setCountry] = useState<string>("")
  // Computed once per render. ~250 items; cheap enough not to memoize.
  const { pinned, rest } = sortedCountries()

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const data = new FormData(e.currentTarget)
    const name = String(data.get("name") || "").trim()
    const email = String(data.get("email") || "").trim()
    const password = String(data.get("password") || "")
    const confirm = String(data.get("confirm-password") || "")

    if (!name) {
      setError("Your name is required.")
      return
    }
    if (country.length !== 2) {
      setError("Please select your country.")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (password !== confirm) {
      setError("Passwords don't match.")
      return
    }
    setBusy(true)
    try {
      await authApi.register(email, password, name, country)
      setSuccess({ email })
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.status === 409) setError("An account with this email already exists.")
        else if (err.status === 429) {
          const m = err.retryAfterSeconds ? Math.ceil(err.retryAfterSeconds / 60) : null
          setError(m ? `Too many attempts. Try again in about ${m} minute${m === 1 ? "" : "s"}.` : "Too many attempts. Try again later.")
        } else setError(err.backendMessage || err.message)
      } else {
        setError(err instanceof Error ? err.message : "Sign up failed.")
      }
    } finally {
      setBusy(false)
    }
  }

  if (success) {
    return (
      <Card {...props}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2Icon className="size-5 text-green-600" />
            <CardTitle>Check your email</CardTitle>
          </div>
          <CardDescription>
            We sent a verification link to{" "}
            <span className="font-medium text-foreground">{success.email}</span>.
            Click it to activate your account, then sign in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <Button type="button" render={<Link href="/login" />}>
                Go to sign in
              </Button>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Enter your information below to create your account
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
              <FieldLabel htmlFor="name">Full Name</FieldLabel>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="John Doe"
                autoComplete="name"
                required
              />
            </Field>
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
              <FieldDescription>
                We&apos;ll use this to contact you. We will not share your email
                with anyone else.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="country">Country</FieldLabel>
              <Select
                value={country}
                onValueChange={(v) => setCountry(v ?? "")}
              >
                <SelectTrigger id="country" className="w-full" aria-label="Country">
                  <SelectValue placeholder="Select your country" />
                </SelectTrigger>
                <SelectContent>
                  {/* Pinned common countries at the top so most users
                      don't have to scroll the full list. */}
                  <SelectGroup>
                    {pinned.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectSeparator />
                  <SelectGroup>
                    {rest.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>
                Your country of residence — used for KYC routing.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
              />
              <FieldDescription>
                Must be at least 8 characters long.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">
                Confirm Password
              </FieldLabel>
              <Input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
              />
              <FieldDescription>Please confirm your password.</FieldDescription>
            </Field>
            <FieldGroup>
              <Field>
                <Button type="submit" disabled={busy}>
                  {busy ? (
                    <>
                      <Loader2Icon className="animate-spin" />
                      Creating account…
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
                <FieldDescription className="px-6 text-center">
                  Already have an account?{" "}
                  <Link href="/login">Sign in</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
