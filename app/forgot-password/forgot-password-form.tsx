"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  forgotPasswordAction,
  type ForgotPasswordState,
} from "@/app/forgot-password/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, ArrowLeft, Mail } from "lucide-react";

const initialState: ForgotPasswordState = {
  message: "",
  status: "idle",
};

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(
    forgotPasswordAction,
    initialState,
  );
  const isSuccess = state.status === "success";

  return (
    <Card className="rounded-3xl border border-[#D9D7D1]/90 bg-[#FFFFFC]/92 p-6 shadow-[0_22px_70px_rgba(14,26,18,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md">
      <CardHeader className="p-0 text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-[#E7EEE9] text-[#254C3B] ring-1 ring-[#C9D8CF]">
          {isSuccess ? <CheckCircle2 className="size-6" /> : <Mail className="size-6" />}
        </div>
        <CardTitle className="text-2xl font-semibold tracking-[-0.02em] text-[#161616]">
          {isSuccess ? "Check your email" : "Reset your password"}
        </CardTitle>
        <CardDescription className="text-balance leading-6 text-[#55534F]">
          {isSuccess
            ? "If your email is registered, a secure reset link is on its way."
            : "Enter the email linked to your LendFolio account."}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <form action={formAction}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="email" className="text-[#33423C]">Email address</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="h-12 rounded-xl border-[#D9D7D1] bg-[#F8F7F3]/80 text-[#161616] shadow-sm placeholder:text-[#77736A] focus-visible:border-[#33423C] focus-visible:ring-[#33423C]/25"
                required
              />
            </Field>

            {state.message ? (
              <Alert
                variant={isSuccess ? "default" : "destructive"}
                className={
                  isSuccess
                    ? "border-[#C9D8CF] bg-[#EFF5F1] text-[#254C3B] *:[svg]:text-[#254C3B] [&_[data-slot=alert-description]]:text-[#33423C]"
                    : undefined
                }
              >
                {isSuccess ? <CheckCircle2 /> : <AlertCircle />}
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            ) : null}

            <Field>
              <SubmitButton />
              <FieldDescription className="text-center text-[#55534F]">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 font-semibold text-[#33423C] underline underline-offset-4 hover:text-[#161616]"
                >
                  <ArrowLeft className="size-3.5" />
                  Back to sign in
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
    <Button type="submit" disabled={pending} className="h-12 w-full rounded-xl border border-[#161616] bg-[#161616] font-semibold !text-white shadow-[0_18px_35px_rgba(14,26,18,0.16)] hover:bg-[#0E1A12]">
      {pending ? "Sending..." : "Send reset link"}
    </Button>
  );
}
