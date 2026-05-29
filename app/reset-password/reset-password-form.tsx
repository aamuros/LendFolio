"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  exchangeResetCodeAction,
  updatePasswordAction,
  type ResetPasswordState,
} from "@/app/reset-password/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

const initialState: ResetPasswordState = {
  message: "",
  status: "idle",
};

type ResetPasswordFormProps = {
  code: string;
};

export function ResetPasswordForm({ code }: ResetPasswordFormProps) {
  const [state, formAction] = useActionState(updatePasswordAction, initialState);
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const isSuccess = state.status === "success";

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      const result = await exchangeResetCodeAction(code);
      if (cancelled) return;

      if (result.ok) {
        setVerified(true);
      } else {
        setVerifyError(result.message);
      }
      setVerifying(false);
    }

    verify();

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (verifying) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Verifying reset link...</p>
        </CardContent>
      </Card>
    );
  }

  if (!verified) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Invalid link</CardTitle>
          <CardDescription>{verifyError}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Link
            href="/forgot-password"
            className="text-sm underline underline-offset-4 hover:text-primary"
          >
            Request a new reset link
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Set new password</CardTitle>
        <CardDescription>
          Enter your new password below
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="password">New password</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="confirmPassword">Confirm new password</FieldLabel>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Re-enter your password"
                required
              />
            </Field>

            {state.message ? (
              <Alert variant={isSuccess ? "default" : "destructive"}>
                {isSuccess ? <CheckCircle2 /> : <AlertCircle />}
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            ) : null}

            <Field>
              <SubmitButton />
              {isSuccess ? (
                <p className="text-center text-sm text-muted-foreground">
                  <Link
                    href="/login"
                    className="underline underline-offset-4 hover:text-primary"
                  >
                    Go to sign in
                  </Link>
                </p>
              ) : null}
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
      {pending ? "Updating..." : "Update password"}
    </Button>
  );
}
