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
import { Checkbox } from "@/components/ui/checkbox";
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
  const hasConfirmationEmail = isSuccess && Boolean(state.confirmationEmail);

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

              <div className="space-y-3 rounded-lg border bg-muted/35 p-4" role="group" aria-label="Required disclosures">
                <ConsentCheckbox
                  name="termsAccepted"
                  id="termsAccepted"
                  defaultChecked={state.values?.termsAccepted}
                  label={
                    <>
                      {"I agree to the "}
                      <LegalDialog
                        trigger={
                          <button type="button" className="underline underline-offset-4 hover:text-primary">
                            Terms of Service
                          </button>
                        }
                        content={termsContent}
                      />
                    </>
                  }
                  error={state.fieldErrors?.termsAccepted}
                />
                <ConsentCheckbox
                  name="privacyAccepted"
                  id="privacyAccepted"
                  defaultChecked={state.values?.privacyAccepted}
                  label={
                    <>
                      {"I acknowledge the "}
                      <LegalDialog
                        trigger={
                          <button type="button" className="underline underline-offset-4 hover:text-primary">
                            Privacy Notice
                          </button>
                        }
                        content={privacyContent}
                      />
                    </>
                  }
                  error={state.fieldErrors?.privacyAccepted}
                />
              </div>

              {!passwordMismatch && state.message ? (
                <Alert variant={isSuccess ? "default" : "destructive"}>
                  {isSuccess ? <CheckCircle2 /> : <AlertCircle />}
                  <AlertDescription>
                    {state.message}
                    {state.errorCode ? (
                      <span className="mt-1 block text-xs font-medium uppercase tracking-normal">
                        Code: {state.errorCode}
                      </span>
                    ) : null}
                  </AlertDescription>
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
      {hasConfirmationEmail ? (
        <FieldDescription className="px-6 text-center">
          We sent the confirmation link to{" "}
          <span className="break-all font-medium text-foreground">
            {state.confirmationEmail}
          </span>
          .
        </FieldDescription>
      ) : null}
    </div>
  );
}

function ConsentCheckbox({
  name,
  id,
  label,
  error,
  defaultChecked,
}: {
  name: string;
  id: string;
  label: React.ReactNode;
  error?: string[];
  defaultChecked?: boolean;
}) {
  return (
    <div className="grid gap-1">
      <div className="grid grid-cols-[1.125rem_1fr] items-start gap-x-2.5">
        <Checkbox
          id={id}
          name={name}
          value="on"
          className="mt-0.5"
          defaultChecked={defaultChecked}
          required
        />
        <FieldLabel htmlFor={id} className="inline text-sm font-normal leading-snug">
          {label}
        </FieldLabel>
      </div>
      <FieldErrorHelper messages={error} />
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
