"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { loginAction, type LoginState } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const initialState: LoginState = {
  message: "",
};

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <Card className="rounded-3xl border border-[#D9D7D1]/85 bg-[#FFFFFC]/88 p-6 shadow-[0_32px_90px_rgba(14,26,18,0.16),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-md">
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

            <LoginError state={state} />

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

function LoginError({ state }: { state: LoginState }) {
  const { pending } = useFormStatus();

  if (!state.message || pending) {
    return null;
  }

  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertDescription>{state.message}</AlertDescription>
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
