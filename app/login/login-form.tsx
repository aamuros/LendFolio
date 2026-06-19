"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { loginAction, type LoginState } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";

const initialState: LoginState = {
  message: "",
};

export function LoginForm({
  notice,
}: {
  notice?: { message: string; status: "error" | "success" } | null;
}) {
  const [state, formAction] = useActionState(loginAction, initialState);
  const [hashNotice, setHashNotice] = useState<
    { message: string; status: "error" | "success" } | null
  >(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const parsedNotice = getConfirmationHashNotice(window.location.hash);

    if (parsedNotice) {
      const timeout = window.setTimeout(() => {
        setHashNotice(parsedNotice);
      }, 0);

      return () => {
        window.clearTimeout(timeout);
      };
    }
  }, []);

  return (
    <Card className="rounded-3xl border border-[#D9D7D1]/90 bg-[#FFFFFC]/92 p-6 shadow-[0_22px_70px_rgba(14,26,18,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md">
      <CardHeader className="p-0 text-center">
        <CardTitle className="text-2xl font-semibold tracking-[-0.02em] text-[#161616]">
          Sign in
        </CardTitle>
        <CardDescription className="text-[#55534F]">
          Enter your credentials to continue
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <form action={formAction}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="email" className="text-[#33423C]">
                Email
              </FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                }}
                autoComplete="email"
                placeholder="you@example.com"
                className="h-12 rounded-xl border-[#D9D7D1] bg-[#F8F7F3]/80 text-[#161616] shadow-sm transition-colors placeholder:text-[#77736A] focus-visible:border-[#33423C] focus-visible:ring-[#33423C]/25"
                required
              />
            </Field>

            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="password" className="text-[#33423C]">
                  Password
                </FieldLabel>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-[#55534F] transition-colors hover:text-[#161616] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#33423C]"
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
                }}
                autoComplete="current-password"
                placeholder="Enter your password"
                className="h-12 rounded-xl border-[#D9D7D1] bg-[#F8F7F3]/80 text-[#161616] shadow-sm transition-colors placeholder:text-[#77736A] focus-visible:border-[#33423C] focus-visible:ring-[#33423C]/25"
                required
              />
            </Field>

            <LoginMessage notice={hashNotice ?? notice} state={state} />

            <Field>
              <SubmitButton />
            </Field>
          </FieldGroup>
        </form>

        <div className="mt-3 text-center text-sm text-[#55534F]">
          <p>
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-semibold text-[#33423C] underline underline-offset-4 transition-colors hover:text-[#161616] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#33423C]"
            >
              Sign up
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function getConfirmationHashNotice(hash: string) {
  if (!hash.startsWith("#")) {
    return null;
  }

  const params = new URLSearchParams(hash.slice(1));
  const errorCode = params.get("error_code")?.toLowerCase() ?? "";
  const errorDescription =
    params.get("error_description")?.toLowerCase() ?? "";

  if (
    params.has("error") ||
    errorCode === "otp_expired" ||
    errorDescription.includes("invalid") ||
    errorDescription.includes("expired")
  ) {
    return {
      status: "error" as const,
      message: "This confirmation link is invalid or has expired.",
    };
  }

  return null;
}

function LoginMessage({
  notice,
  state,
}: {
  notice?: { message: string; status: "error" | "success" } | null;
  state: LoginState;
}) {
  const { pending } = useFormStatus();

  if (pending) {
    return null;
  }

  if (state.message) {
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertDescription>{state.message}</AlertDescription>
      </Alert>
    );
  }

  if (!notice) {
    return null;
  }

  return (
    <Alert variant={notice.status === "success" ? "default" : "destructive"}>
      {notice.status === "success" ? <CheckCircle2 /> : <AlertCircle />}
      <AlertDescription>{notice.message}</AlertDescription>
    </Alert>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-xl border border-[#161616] bg-[#161616] font-semibold !text-white shadow-[0_18px_35px_rgba(14,26,18,0.16)] transition-all hover:bg-[#0E1A12] hover:shadow-[0_20px_40px_rgba(14,26,18,0.2)] focus-visible:outline-[#161616]"
    >
      {pending ? "Signing in..." : "Sign in"}
    </Button>
  );
}
