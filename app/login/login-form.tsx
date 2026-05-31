"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { loginAction, type LoginState } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle } from "lucide-react";

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
    <Card className="rounded-2xl p-6">
      <CardHeader className="p-0 text-center">
        <CardTitle className="text-xl">Sign in</CardTitle>
        <CardDescription>
          Enter your credentials to continue
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <form
          action={formAction}
          onSubmit={() => setSubmittedVersion(formVersion)}
        >
          <FieldGroup className="gap-4">
            {showSignedOut ? (
              <Alert>
                <CheckCircle2 />
                <AlertDescription>Signed out successfully</AlertDescription>
              </Alert>
            ) : null}

            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
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
                className="h-12 rounded-xl bg-background"
                required
              />
            </Field>

            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  Forgot password?
                </Link>
              </div>
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
                className="h-12 rounded-xl bg-background"
                required
              />
            </Field>

            {showError ? (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            ) : null}

            <Field>
              <SubmitButton />
            </Field>
          </FieldGroup>
        </form>

        <div className="mt-3 text-center text-sm text-muted-foreground">
          <p>
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="underline underline-offset-4 hover:text-primary"
            >
              Sign up
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="h-12 w-full rounded-xl">
      {pending ? "Signing in..." : "Sign in"}
    </Button>
  );
}
