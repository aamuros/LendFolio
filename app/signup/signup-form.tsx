"use client";

import { useActionState, useCallback, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { signupAction, type SignupState } from "@/app/signup/actions";
import type { SignupRole } from "@/lib/signup";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, HandCoins, Landmark } from "lucide-react";

const initialState: SignupState = {
  message: "",
  status: "idle",
};

export function SignupForm() {
  const [state, serverAction] = useActionState(signupAction, initialState);
  const [role, setRole] = useState<SignupRole>("borrower");
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const isSuccess = state.status === "success";

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
    <Card className="rounded-2xl p-6">
      <CardHeader className="p-0 text-center">
        <CardTitle className="text-xl">Create account</CardTitle>
        <CardDescription>Get started with LendFolio</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <form ref={formRef} action={handleSubmit}>
          <FieldGroup className="gap-5">
            <fieldset className="grid gap-2">
              <RadioGroup
                defaultValue="borrower"
                value={role}
                onValueChange={(val) => setRole(val as SignupRole)}
                name="role"
                className="grid grid-cols-2 gap-2"
              >
                <RoleCard
                  value="borrower"
                  id="role-borrower"
                  icon={HandCoins}
                  label="Borrower"
                  description="Apply for loans and track repayments."
                />
                <RoleCard
                  value="lender"
                  id="role-lender"
                  icon={Landmark}
                  label="Lender"
                  description="Review applications, send offers, and verify repayments."
                />
              </RadioGroup>
              <FieldErrorHelper messages={state.fieldErrors?.role} />
            </fieldset>

            <Field>
              <FieldLabel htmlFor="displayName">Full name</FieldLabel>
              <Input
                id="displayName"
                name="displayName"
                autoComplete="name"
                placeholder="Juan dela Cruz"
                className="h-12 rounded-xl bg-background"
                required
              />
              <FieldErrorHelper messages={state.fieldErrors?.displayName} />
            </Field>

            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="h-12 rounded-xl bg-background"
                required
              />
              <FieldErrorHelper messages={state.fieldErrors?.email} />
            </Field>

            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className="h-12 rounded-xl bg-background"
                required
                onChange={() => passwordMismatch && setPasswordMismatch(false)}
              />
              <FieldErrorHelper messages={state.fieldErrors?.password} />
            </Field>

            <Field>
              <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Re-enter your password"
                className="h-12 rounded-xl bg-background"
                required
                onChange={() => passwordMismatch && setPasswordMismatch(false)}
              />
              <FieldErrorHelper messages={confirmPasswordErrors} />
            </Field>

            <fieldset className="rounded-lg border bg-muted/30 p-3">
              <legend className="sr-only">Required disclosures</legend>
              <div className="grid gap-2.5">
                <ConsentCheckbox
                  name="termsAccepted"
                  id="termsAccepted"
                  label={
                    <>
                      I agree to the{" "}
                      <Link href="/terms" className="underline underline-offset-4 hover:text-primary">
                        Terms of Service
                      </Link>
                      .
                    </>
                  }
                  error={state.fieldErrors?.termsAccepted}
                />
                <ConsentCheckbox
                  name="privacyAccepted"
                  id="privacyAccepted"
                  label={
                    <>
                      I acknowledge the{" "}
                      <Link href="/privacy" className="underline underline-offset-4 hover:text-primary">
                        Privacy Notice
                      </Link>
                      .
                    </>
                  }
                  error={state.fieldErrors?.privacyAccepted}
                />
              </div>
            </fieldset>

            {!passwordMismatch && state.message ? (
              <Alert variant={isSuccess ? "default" : "destructive"}>
                {isSuccess ? <CheckCircle2 /> : <AlertCircle />}
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            ) : null}

            <Field>
              <SubmitButton />
            </Field>
          </FieldGroup>
        </form>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          <p>
            Already have an account?{" "}
            <Link
              href="/login"
              className="underline underline-offset-4 hover:text-primary"
            >
              Log in
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function RoleCard({
  value,
  id,
  icon: Icon,
  label,
  description,
}: {
  value: string;
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
}) {
  return (
    <div className="flex">
      <RadioGroupItem value={value} id={id} className="peer sr-only" />
      <Label
        htmlFor={id}
        className={cn(
          "flex w-full flex-col items-center gap-2.5 cursor-pointer rounded-xl border bg-card px-4 py-5 text-center transition-all",
          "hover:bg-muted/50",
          "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2"
        )}
      >
        <Icon className="size-5 shrink-0 text-muted-foreground" />
        <span className="text-sm font-semibold leading-none">{label}</span>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </Label>
    </div>
  );
}

function ConsentCheckbox({
  name,
  id,
  label,
  error,
}: {
  name: string;
  id: string;
  label: React.ReactNode;
  error?: string[];
}) {
  return (
    <div className="grid gap-1">
      <div className="flex items-start gap-2.5">
        <Checkbox id={id} name={name} value="on" className="mt-0.5" required />
        <Label htmlFor={id} className="text-sm font-normal leading-snug peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </Label>
      </div>
      <FieldErrorHelper messages={error} />
    </div>
  );
}

function FieldErrorHelper({ messages }: { messages?: string[] }) {
  if (!messages?.length) {
    return null;
  }

  return <FieldError>{messages[0]}</FieldError>;
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="h-12 w-full rounded-xl">
      {pending ? "Creating account..." : "Create account"}
    </Button>
  );
}
