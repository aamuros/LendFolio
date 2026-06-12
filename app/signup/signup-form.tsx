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
import { LegalDialog } from "@/components/legal/legal-dialog";
import { termsContent, privacyContent } from "@/components/legal/legal-content";
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
  const formKey = state.values ? JSON.stringify(state.values) : "initial";

  const confirmPasswordErrors = passwordMismatch
    ? ["Passwords must match."]
    : state.fieldErrors?.confirmPassword;

  return (
    <Card className="rounded-3xl border border-[#D9D7D1]/85 bg-[#FFFFFC]/88 p-5 shadow-[0_32px_90px_rgba(14,26,18,0.16),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-md sm:p-6">
      <CardHeader className="p-0 text-center">
        <CardTitle className="text-2xl font-semibold tracking-[-0.02em] text-[#161616]">
          Create account
        </CardTitle>
        <CardDescription className="text-[#55534F]">
          Get started with LendFolio
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <form
          key={formKey}
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
                className="grid grid-cols-1 gap-2 sm:grid-cols-2"
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
              <FieldLabel htmlFor="displayName" className="text-[#33423C]">Full name <span className="text-destructive">*</span></FieldLabel>
              <Input
                id="displayName"
                name="displayName"
                autoComplete="name"
                placeholder="Juan dela Cruz"
                className="h-12 rounded-xl border-[#D9D7D1] bg-[#F8F7F3]/80 text-[#161616] shadow-sm transition-colors placeholder:text-[#77736A] focus-visible:border-[#33423C] focus-visible:ring-[#33423C]/25"
                defaultValue={state.values?.displayName}
                required
              />
              <FieldErrorHelper messages={state.fieldErrors?.displayName} />
            </Field>

            <Field>
              <FieldLabel htmlFor="email" className="text-[#33423C]">Email <span className="text-destructive">*</span></FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="h-12 rounded-xl border-[#D9D7D1] bg-[#F8F7F3]/80 text-[#161616] shadow-sm transition-colors placeholder:text-[#77736A] focus-visible:border-[#33423C] focus-visible:ring-[#33423C]/25"
                defaultValue={state.values?.email}
                required
              />
              <FieldErrorHelper messages={state.fieldErrors?.email} />
            </Field>

            <Field>
              <FieldLabel htmlFor="password" className="text-[#33423C]">Password <span className="text-destructive">*</span></FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className="h-12 rounded-xl border-[#D9D7D1] bg-[#F8F7F3]/80 text-[#161616] shadow-sm transition-colors placeholder:text-[#77736A] focus-visible:border-[#33423C] focus-visible:ring-[#33423C]/25"
                required
                onChange={() => passwordMismatch && setPasswordMismatch(false)}
              />
              <FieldErrorHelper messages={state.fieldErrors?.password} />
            </Field>

            <Field>
              <FieldLabel htmlFor="confirmPassword" className="text-[#33423C]">Confirm password <span className="text-destructive">*</span></FieldLabel>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Re-enter your password"
                className="h-12 rounded-xl border-[#D9D7D1] bg-[#F8F7F3]/80 text-[#161616] shadow-sm transition-colors placeholder:text-[#77736A] focus-visible:border-[#33423C] focus-visible:ring-[#33423C]/25"
                required
                onChange={() => passwordMismatch && setPasswordMismatch(false)}
              />
              <FieldErrorHelper messages={confirmPasswordErrors} />
            </Field>

            <div className="space-y-3 rounded-2xl border border-[#D9D7D1] bg-[#F8F7F3]/78 p-4" role="group" aria-label="Required disclosures">
                <ConsentCheckbox
                  name="termsAccepted"
                  id="termsAccepted"
                  label={
                    <>
                      {"I agree to the "}
                      <LegalDialog
                        trigger={
                          <button type="button" className="font-medium text-[#33423C] underline underline-offset-4 transition-colors hover:text-[#161616]">
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
                  label={
                    <>
                      {"I acknowledge the "}
                      <LegalDialog
                        trigger={
                          <button type="button" className="font-medium text-[#33423C] underline underline-offset-4 transition-colors hover:text-[#161616]">
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
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            ) : null}

            <Field>
              <SubmitButton isPending={isPending} />
            </Field>
          </FieldGroup>
        </form>

        <div className="mt-4 text-center text-sm text-[#55534F]">
          <p>
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-[#33423C] underline underline-offset-4 transition-colors hover:text-[#161616] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#33423C]"
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
          "flex w-full cursor-pointer flex-col items-center gap-2.5 rounded-2xl border px-4 py-5 text-center transition-all duration-200",
          isSelected
            ? "border-[#33423C] bg-[#0E1A12] text-white shadow-[0_18px_35px_rgba(14,26,18,0.16)] ring-1 ring-[#33423C]/30"
            : "border-[#D9D7D1] bg-[#FFFFFC]/78 text-[#161616] shadow-sm hover:border-[#C7C4BC] hover:bg-[#F8F7F3]",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-[#33423C] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#FFFFFC]"
        )}
      >
        <Icon className={cn("size-5 shrink-0 transition-colors duration-150", isSelected ? "text-[#E6DDCB]" : "text-[#33423C]")} />
        <span className="text-sm font-semibold leading-none">{label}</span>
        <p className={cn("text-xs leading-relaxed transition-colors duration-150", isSelected ? "text-[#CFC8B9]" : "text-[#5F5F5F]")}>
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
      <div className="grid grid-cols-[1.125rem_1fr] items-start gap-x-2.5 gap-y-0">
        <Checkbox id={id} name={name} value="on" className="mt-0.5 border-[#C7C4BC] data-[state=checked]:border-[#33423C] data-[state=checked]:bg-[#33423C]" required />
        <Label htmlFor={id} className="inline text-sm leading-snug font-normal text-[#4F4F4B] peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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
    <Button
      type="submit"
      disabled={isPending}
      className="h-12 w-full rounded-xl border border-[#161616] bg-[#161616] font-semibold !text-white shadow-[0_18px_35px_rgba(14,26,18,0.16)] transition-all hover:bg-[#0E1A12] hover:shadow-[0_20px_40px_rgba(14,26,18,0.2)] focus-visible:outline-[#161616]"
    >
      {isPending ? "Creating account..." : "Create account"}
    </Button>
  );
}
