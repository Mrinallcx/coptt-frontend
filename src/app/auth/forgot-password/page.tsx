"use client";

// Forgot password. Backend always returns 200 to avoid email enumeration,
// so the success state shows the same message regardless of whether the
// email matched a user. In dev mode the backend surfaces reset_url too.

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  CircleAlertIcon,
  Loader2Icon,
  MailCheckIcon,
  SendIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { ApiRequestError, authApi } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setDevResetUrl(null);
    setBusy(true);
    try {
      const res = await authApi.forgotPassword(email);
      setSent(true);
      if (res.reset_url) setDevResetUrl(res.reset_url);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 429) {
        const m = err.retryAfterSeconds
          ? Math.ceil(err.retryAfterSeconds / 60)
          : null;
        setError(
          m
            ? `Too many requests. Try again in about ${m} minute${m === 1 ? "" : "s"}.`
            : "Too many requests. Please try again later.",
        );
      } else {
        setError(
          err instanceof Error ? err.message : "Couldn't send the reset email.",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-base">Reset your password</CardTitle>
          <CardDescription>
            {sent
              ? "Check your email for a reset link."
              : "Enter your email and we'll send you a reset link."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-2.5 text-xs">
                <MailCheckIcon className="size-4 mt-0.5 shrink-0 text-green-600" />
                <span>
                  If an account exists for that email, we&apos;ve sent a
                  password reset link. The link is valid for 1 hour.
                </span>
              </div>
              {devResetUrl && (
                <div className="rounded-lg border border-input bg-muted/40 p-3 text-xs space-y-1">
                  <p className="font-medium text-muted-foreground">
                    Dev only — reset link
                  </p>
                  <a
                    href={devResetUrl}
                    className="break-all text-foreground hover:underline"
                  >
                    {devResetUrl}
                  </a>
                </div>
              )}
              <Button size="sm" className="w-full" variant="outline" nativeButton={false} render={<Link href="/login" />}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
                  <CircleAlertIcon className="size-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                size="sm"
                disabled={busy}
                className="w-full"
              >
                {busy ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <SendIcon />
                )}
                Send reset link
              </Button>

              <p className="text-center text-xs text-muted-foreground pt-2">
                Remembered it?{" "}
                <Link
                  href="/login"
                  className="font-medium text-foreground hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
