"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: LoginState = {
  message: "",
};

type LoginFormProps = {
  signedOut?: boolean;
};

export function LoginForm({ signedOut = false }: LoginFormProps) {
  const [state, formAction] = useActionState(loginAction, initialState);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formVersion, setFormVersion] = useState(0);
  const [submittedVersion, setSubmittedVersion] = useState(0);
  const [showSignedOut, setShowSignedOut] = useState(signedOut);
  const showError = Boolean(state.message && formVersion === submittedVersion);

  useEffect(() => {
    if (!signedOut) {
      return;
    }

    router.replace("/login", { scroll: false });
    const timeout = window.setTimeout(() => setShowSignedOut(false), 3000);

    return () => window.clearTimeout(timeout);
  }, [router, signedOut]);

  function markEdited() {
    setFormVersion((current) => current + 1);
    setShowSignedOut(false);
  }

  return (
    <Card className="shadow-form">
      <CardHeader>
        <CardTitle className="text-3xl font-semibold tracking-[-0.01em]">Sign in</CardTitle>
        <CardDescription>Enter your email and password to access your account</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          action={formAction}
          className="grid gap-5"
          onSubmit={() => setSubmittedVersion(formVersion)}
        >
          {showSignedOut ? (
            <p
              className="inline-flex w-fit items-center gap-2 rounded-full bg-[#edf5f1] px-3 py-1.5 text-sm font-medium text-[#244a3c]"
              role="status"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              >
                <path d="m5 12 4 4L19 6" />
              </svg>
              Signed out
            </p>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                markEdited();
              }}
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                markEdited();
              }}
              autoComplete="current-password"
              placeholder="Enter your password"
              required
            />
          </div>

          {showError ? (
            <p
              className="border-l-2 border-[var(--accent)] bg-[var(--background)] px-4 py-3 text-sm leading-6 text-[var(--muted-foreground)]"
              role="alert"
            >
              {state.message}
            </p>
          ) : null}

          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full mt-1">
      {pending ? "Signing in..." : "Sign in"}
    </Button>
  );
}
