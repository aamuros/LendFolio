"use client";

import { useActionState, useCallback, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  lenderRegisterAction,
  type LenderRegisterState,
} from "@/app/lender/register/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LegalDialog } from "@/components/legal/legal-dialog";
import { termsContent, privacyContent } from "@/components/legal/legal-content";
import { AlertCircle, CheckCircle2 } from "lucide-react";

const initialState: LenderRegisterState = {
  message: "",
  status: "idle",
};

export function LenderRegisterForm() {
  const [state, serverAction] = useActionState(
    lenderRegisterAction,
    initialState,
  );
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const isSuccess = state.status === "success";
  const formKey = state.values ? JSON.stringify(state.values) : "initial";

  const handleSubmit = useCallback(
    (formData: FormData) => {
      const password = formData.get("password") as string;
      const confirmPassword = formData.get("confirmPassword") as string;

      if (password !== confirmPassword) {
        setPasswordMismatch(true);
        return;
      }

      setPasswordMismatch(false);
      serverAction(formData);
    },
    [serverAction],
  );

  const confirmPasswordErrors = passwordMismatch
    ? ["Passwords must match."]
    : state.fieldErrors?.confirmPassword;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            Create your lender account
          </CardTitle>
          <CardDescription>
            Enter your details below to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form key={formKey} action={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="displayName">Full name</FieldLabel>
                <Input
                  id="displayName"
                  name="displayName"
                  type="text"
                  placeholder="John Doe"
                  autoComplete="name"
                  defaultValue={state.values?.displayName}
                  required
                />
                <FieldErrorHelper
                  messages={state.fieldErrors?.displayName}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Work email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  autoComplete="email"
                  defaultValue={state.values?.email}
                  required
                />
                <FieldErrorHelper messages={state.fieldErrors?.email} />
              </Field>
              <Field>
                <FieldLabel htmlFor="organizationName">
                  Company name
                </FieldLabel>
                <Input
                  id="organizationName"
                  name="organizationName"
                  type="text"
                  placeholder="Acme Corp"
                  autoComplete="organization"
                  defaultValue={state.values?.organizationName}
                  required
                />
                <FieldErrorHelper
                  messages={state.fieldErrors?.organizationName}
                />
              </Field>
              <Field>
                <Field className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      onChange={() => passwordMismatch && setPasswordMismatch(false)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirmPassword">
                      Confirm password
                    </FieldLabel>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      onChange={() => passwordMismatch && setPasswordMismatch(false)}
                    />
                  </Field>
                </Field>
                <FieldDescription>
                  Must be at least 8 characters long.
                </FieldDescription>
                <FieldErrorHelper
                  messages={state.fieldErrors?.password}
                />
                <FieldErrorHelper
                  messages={confirmPasswordErrors}
                />
              </Field>

              {!passwordMismatch && state.message ? (
                <Alert variant={isSuccess ? "default" : "destructive"}>
                  {isSuccess ? <CheckCircle2 /> : <AlertCircle />}
                  <AlertDescription>{state.message}</AlertDescription>
                </Alert>
              ) : null}

              <Field>
                <SubmitButton />
                <FieldDescription className="text-center">
                  Already have an account?{" "}
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
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our{" "}
        <LegalDialog
          trigger={
            <button type="button" className="underline underline-offset-4 hover:text-primary">
              Terms of Service
            </button>
          }
          content={termsContent}
        />{" "}
        and{" "}
        <LegalDialog
          trigger={
            <button type="button" className="underline underline-offset-4 hover:text-primary">
              Privacy Policy
            </button>
          }
          content={privacyContent}
        />.
      </FieldDescription>
    </div>
  );
}

function FieldErrorHelper({ messages }: { messages?: string[] }) {
  if (!messages?.length) {
    return null;
  }

  return (
    <p className="text-sm text-destructive" role="alert">
      {messages[0]}
    </p>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Creating account..." : "Create account"}
    </Button>
  );
}

