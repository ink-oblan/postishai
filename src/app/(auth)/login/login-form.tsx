"use client";

import { useSearchParams } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppConfig } from "@/lib/app-config-context";
import { login, register } from "@/lib/auth/actions";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function LoginForm() {
  const { selfDeployment } = useAppConfig();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [emailValue, setEmailValue] = useState("");
  const [loginState, loginAction, loginPending] = useActionState(login, undefined);
  const [registerState, registerAction, registerPending] = useActionState(register, undefined);
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error");

  const state = mode === "login" ? loginState : registerState;

  useEffect(() => {
    if (state?.submittedEmail) setEmailValue(state.submittedEmail);
  }, [state?.submittedEmail]);
  const action = mode === "login" ? loginAction : registerAction;
  const pending = mode === "login" ? loginPending : registerPending;

  return (
    <div className="space-y-6">
      {!selfDeployment && (
        <>
          {/* Google Sign In */}
          <a href="/api/auth/google">
            <Button variant="outline" size="lg" className="w-full gap-2">
              <GoogleIcon />
              Continue with Google
            </Button>
          </a>

          {oauthError && (
            <p className="text-center text-destructive text-sm">
              Google sign-in failed. Please try again.
            </p>
          )}

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-border border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>
        </>
      )}

      {/* Email/Password Form */}
      <form action={action} className="space-y-4">
        {mode === "register" && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="Your name" />
              {state?.errors?.name && (
                <p className="text-destructive text-xs">{state.errors.name[0]}</p>
              )}
            </div>
            {!selfDeployment && (
              <div className="space-y-1.5">
                <Label htmlFor="useCaseDetails">How will you use PostishAI? Optional</Label>
                <Textarea
                  id="useCaseDetails"
                  name="useCaseDetails"
                  placeholder="Tell us what you want to create and how you plan to use the demo."
                  className="min-h-24 resize-none"
                />
                {state?.errors?.useCaseDetails && (
                  <p className="text-destructive text-xs">{state.errors.useCaseDetails[0]}</p>
                )}
              </div>
            )}
          </>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={emailValue}
            onChange={(e) => setEmailValue(e.target.value)}
          />
          {state?.errors?.email && (
            <p className="text-destructive text-xs">{state.errors.email[0]}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" placeholder="Enter your password" />
          {state?.errors?.password && (
            <p className="text-destructive text-xs">{state.errors.password[0]}</p>
          )}
        </div>

        {state?.message && <p className="text-destructive text-sm">{state.message}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending
            ? mode === "login"
              ? "Signing in..."
              : "Creating account..."
            : mode === "login"
              ? "Sign in"
              : "Create account"}
        </Button>
      </form>

      {/* Toggle mode */}
      <p className="text-center text-muted-foreground text-sm">
        {mode === "login" ? (
          <>
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => setMode("register")}
              className="text-primary underline-offset-4 hover:underline"
            >
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => setMode("login")}
              className="text-primary underline-offset-4 hover:underline"
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  );
}
