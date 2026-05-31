"use client";

import { useActionState, useState } from "react";
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
  const [state, formAction, isPending] = useActionState(signupAction, initialState);
  const [role, setRole] = useState<SignupRole>("borrower");
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const isSuccess = state.status === "success";

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
        <form
          action={formAction}
          onSubmit={(e) => {
            const form = e.currentTarget;
            const formData = new FormData(form);
            const password = formData.get("password") as string;
            const confirmPassword = formData.get("confirmPassword") as string;

            if (password !== confirmPassword) {
              e.preventDefault();
              setPasswordMismatch(true);
              return;
            }

            setPasswordMismatch(false);
          }}
        >
          <FieldGroup className="gap-5">
            <fieldset className="grid gap-2">
              <input type="hidden" name="role" value={role} />
              <RadioGroup
                value={role}
                onValueChange={(val) => setRole(val as SignupRole)}
                className="grid grid-cols-2 gap-2"
              >
                <RoleCard
                  value="borrower"
                  id="role-borrower"
                  icon={HandCoins}
                  label="Borrower"
                  description="Apply for loans and track repayments."
                  isSelected={role === "borrower"}
                />
                <RoleCard
                  value="lender"
                  id="role-lender"
                  icon={Landmark}
                  label="Lender"
                  description="Review applications, send offers, and verify repayments."
                  isSelected={role === "lender"}
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

            <div className="space-y-3 rounded-lg bg-muted/40 p-4" role="group" aria-label="Required disclosures">
                <ConsentCheckbox
                  name="termsAccepted"
                  id="termsAccepted"
                  label={
                    <>
                      I agree to the{" "}
                      <Link href="/terms?from=signup" className="underline underline-offset-4 hover:text-primary">
                        Terms of Service
                      </Link>.
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
                      <Link href="/privacy?from=signup" className="underline underline-offset-4 hover:text-primary">
                        Privacy Notice
                      </Link>.
                    </>
                  }
                  error={state.fieldErrors?.privacyAccepted}
                />
            </div>

            {!passwordMismatch && state.message ? (
              <Alert variant={isSuccess ? "default" : "destructive"}>
                {isSuccess ? <CheckCircle2 /> : <AlertCircle />}
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            ) : null}

            <Field>
              <SubmitButton isPending={isPending} />
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
  isSelected,
}: {
  value: string;
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  isSelected: boolean;
}) {
  return (
    <div className="flex">
      <RadioGroupItem value={value} id={id} className="peer sr-only" />
      <Label
        htmlFor={id}
        className={cn(
          "flex w-full flex-col items-center gap-2.5 cursor-pointer rounded-xl border px-4 py-5 text-center transition-colors duration-150",
          isSelected
            ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm"
            : "border-border/50 bg-card shadow-sm hover:bg-muted/50 hover:border-border/80",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2"
        )}
      >
        <Icon className={cn("size-5 shrink-0 transition-colors duration-150", isSelected ? "text-primary" : "text-muted-foreground")} />
        <span className="text-sm font-semibold leading-none">{label}</span>
        <p className={cn("text-xs leading-relaxed transition-colors duration-150", isSelected ? "text-foreground/70" : "text-muted-foreground")}>
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

function SubmitButton({ isPending }: { isPending: boolean }) {
  return (
    <Button type="submit" disabled={isPending} className="h-12 w-full rounded-xl">
      {isPending ? "Creating account..." : "Create account"}
    </Button>
  );
}
