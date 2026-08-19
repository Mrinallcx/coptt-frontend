"use client";

// Email verification landing page. Backend emails a link of the form
// {APP_URL}/auth/verify?token=<jwt>. We pluck the token out and POST it
// to /auth/verify-email; backend flips users.email_verified=true.

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

import { ApiRequestError, authApi } from "@/lib/api";

type State =
  | { kind: "loading" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}

function VerifyEmailInner() {
  const params = useSearchParams();
  const token = params?.get("token") ?? null;
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ kind: "error", message: "Missing verification token in the URL." });
      return;
    }
    let cancelled = false;
    authApi
      .verifyEmail(token)
      .then((res) => {
        if (cancelled) return;
        setState({
          kind: "success",
          message: res.message || "Email verified successfully.",
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg =
          err instanceof ApiRequestError
            ? err.backendMessage || err.error || err.message
            : err instanceof Error
              ? err.message
              : "Something went wrong verifying your email.";
        setState({ kind: "error", message: msg });
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            {state.kind === "loading" && (
              <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
            )}
            {state.kind === "success" && (
              <CheckCircle2Icon className="size-5 text-green-600" />
            )}
            {state.kind === "error" && (
              <CircleAlertIcon className="size-5 text-destructive" />
            )}
            <CardTitle className="text-base">
              {state.kind === "loading" && "Verifying your email"}
              {state.kind === "success" && "Email verified"}
              {state.kind === "error" && "Verification failed"}
            </CardTitle>
          </div>
          <CardDescription>
            {state.kind === "loading" && "Hang tight, this only takes a moment."}
            {state.kind === "success" && state.message}
            {state.kind === "error" && state.message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state.kind === "success" && (
            <Button size="sm" className="w-full" nativeButton={false} render={<Link href="/login" />}>
              Continue to sign in
            </Button>
          )}
          {state.kind === "error" && (
            <div className="flex flex-col gap-2">
              <Button size="sm" variant="outline" className="w-full" nativeButton={false} render={<Link href="/signup" />}>
                Sign up again
              </Button>
              <Button size="sm" variant="ghost" className="w-full" nativeButton={false} render={<Link href="/login" />}>
                Back to sign in
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
