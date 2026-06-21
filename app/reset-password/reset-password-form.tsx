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
import { PasswordInput } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Loader2, KeyRound, ArrowLeft, RefreshCw } from "lucide-react";

const cardClassName = "rounded-3xl border border-[#D9D7D1]/90 bg-[#FFFFFC]/92 p-6 shadow-[0_22px_70px_rgba(14,26,18,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md";
const inputClassName = "h-12 rounded-xl border-[#D9D7D1] bg-[#F8F7F3]/80 text-[#161616] shadow-sm placeholder:text-[#77736A] focus-visible:border-[#33423C] focus-visible:ring-[#33423C]/25";

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
      <Card className={cardClassName}>
        <CardContent className="flex flex-col items-center gap-4 p-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[#E7EEE9] text-[#254C3B] ring-1 ring-[#C9D8CF]">
            <Loader2 className="size-6 animate-spin" />
          </div>
          <div>
            <p className="text-lg font-semibold text-[#161616]">Checking your reset link</p>
            <p className="mt-1 text-sm text-[#55534F]">This should only take a moment.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!verified) {
    return (
      <Card className={cardClassName}>
        <CardHeader className="p-0 text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-[#F7EBE8] text-[#9F392C] ring-1 ring-[#E8C9C2]">
            <AlertCircle className="size-6" />
          </div>
          <CardTitle className="text-2xl font-semibold tracking-[-0.02em] text-[#161616]">Reset link unavailable</CardTitle>
          <CardDescription className="text-balance leading-6 text-[#55534F]">{verifyError} Request a fresh link to continue.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Button asChild className="h-12 w-full rounded-xl bg-[#161616] font-semibold !text-white hover:bg-[#0E1A12]">
            <Link href="/forgot-password"><RefreshCw className="size-4" />Request a new link</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cardClassName}>
      <CardHeader className="p-0 text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-[#E7EEE9] text-[#254C3B] ring-1 ring-[#C9D8CF]">
          {isSuccess ? <CheckCircle2 className="size-6" /> : <KeyRound className="size-6" />}
        </div>
        <CardTitle className="text-2xl font-semibold tracking-[-0.02em] text-[#161616]">{isSuccess ? "Password updated" : "Create a new password"}</CardTitle>
        <CardDescription className="text-balance leading-6 text-[#55534F]">
          {isSuccess ? "Your LendFolio account is ready. Sign in with your new password." : "Use at least 8 characters and avoid passwords you use elsewhere."}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <form action={formAction}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="password" className="text-[#33423C]">New password</FieldLabel>
              <PasswordInput
                id="password"
                name="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className={inputClassName}
                disabled={isSuccess}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="confirmPassword" className="text-[#33423C]">Confirm new password</FieldLabel>
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                autoComplete="new-password"
                placeholder="Re-enter your password"
                className={inputClassName}
                disabled={isSuccess}
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
              {isSuccess ? (
                <Button asChild className="h-12 w-full rounded-xl bg-[#161616] font-semibold !text-white hover:bg-[#0E1A12]">
                  <Link href="/login">Continue to sign in</Link>
                </Button>
              ) : <SubmitButton />}
              {!isSuccess ? (
                <p className="text-center text-sm text-[#55534F]"><Link href="/login" className="inline-flex items-center gap-1.5 font-semibold text-[#33423C] underline underline-offset-4 hover:text-[#161616]"><ArrowLeft className="size-3.5" />Back to sign in</Link></p>
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
    <Button type="submit" disabled={pending} className="h-12 w-full rounded-xl border border-[#161616] bg-[#161616] font-semibold !text-white shadow-[0_18px_35px_rgba(14,26,18,0.16)] hover:bg-[#0E1A12]">
      {pending ? "Updating..." : "Update password"}
    </Button>
  );
}
