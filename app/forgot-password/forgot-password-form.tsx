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
import { CheckCircle2, AlertCircle } from "lucide-react";

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
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Reset password</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a link to reset your password
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
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
              <FieldDescription className="text-center">
                Remember your password?{" "}
                <Link
                  href="/login"
                  className="underline underline-offset-4 hover:text-primary"
                >
                  Sign in
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
      {pending ? "Sending..." : "Send reset link"}
    </Button>
  );
}
