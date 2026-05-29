"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { loginAction, type LoginState } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
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
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Sign in</CardTitle>
        <CardDescription>
          Enter your email and password to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          action={formAction}
          onSubmit={() => setSubmittedVersion(formVersion)}
        >
          <FieldGroup>
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
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
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
            </Field>

            {showError ? (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            ) : null}

            <Field>
              <SubmitButton />
              <FieldDescription className="text-center">
                Don&apos;t have an account?{" "}
                <Link
                  href="/signup"
                  className="underline underline-offset-4 hover:text-primary"
                >
                  Sign up
                </Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Signing in..." : "Sign in"}
    </Button>
  );
}
