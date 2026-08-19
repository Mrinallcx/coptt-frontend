"use client";

// Reset password page. Consumes ?token=<password_reset JWT> from the
// email link, accepts a new password, hits the backend. On success the
// backend has nuked every existing session for the user, so we send them
// to /login to sign in fresh.

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2Icon,
  CircleAlertIcon,
  Loader2Icon,
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}

function ResetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params?.get("token") ?? null;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CircleAlertIcon className="size-5 text-destructive" />
              <CardTitle className="text-base">Reset link is invalid</CardTitle>
            </div>
            <CardDescription>
              The link you used is missing a token. Request a new one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="sm" className="w-full" nativeButton={false} render={<Link href="/auth/forgot-password" />}>
              Request a new link
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      await authApi.resetPassword(token, password);
      toast.success("Password updated. You can sign in now.");
      router.replace("/login");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.status === 400) {
          setError(
            err.backendMessage ||
              "This reset link is invalid or has expired. Request a new one.",
          );
        } else if (err.status === 429) {
          const m = err.retryAfterSeconds
            ? Math.ceil(err.retryAfterSeconds / 60)
            : null;
          setError(
            m
              ? `Too many attempts. Try again in about ${m} minute${m === 1 ? "" : "s"}.`
              : "Too many attempts. Please try again later.",
          );
        } else {
          setError(err.backendMessage || err.message);
        }
      } else {
        setError(
          err instanceof Error ? err.message : "Couldn't reset your password.",
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
          <CardTitle className="text-base">Choose a new password</CardTitle>
          <CardDescription>
            Pick something you haven&apos;t used before. Minimum 8 characters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
                <CircleAlertIcon className="size-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <Button type="submit" size="sm" disabled={busy} className="w-full">
              {busy ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <CheckCircle2Icon />
              )}
              Set new password
            </Button>

            <p className="text-center text-xs text-muted-foreground pt-2">
              <Link
                href="/login"
                className="font-medium text-foreground hover:underline"
              >
                Back to sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
