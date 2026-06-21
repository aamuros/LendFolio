"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  signupAction,
  type SignupState,
} from "@/app/signup/actions";
import {
  isSignupDuplicateEmailError,
  isSignupValidationError,
} from "@/lib/auth-signup-errors";
import type { SignupRole } from "@/lib/signup";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LegalDialog } from "@/components/legal/legal-dialog";
import { termsContent, privacyContent } from "@/components/legal/legal-content";
import { AlertCircle, HandCoins, Landmark } from "lucide-react";

const initialState: SignupState = {
  message: "",
  status: "idle",
};

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(signupAction, initialState);

  return (
    <SignupFormContent
      state={state}
      formAction={formAction}
      isPending={isPending}
    />
  );
}

function SignupFormContent({
  state,
  formAction,
  isPending,
}: {
  state: SignupState;
  formAction: (payload: FormData) => void;
  isPending: boolean;
}) {
  const [role, setRole] = useState<SignupRole>(
    isSignupRole(state.values?.role) ? state.values.role : "borrower",
  );
  const [termsAccepted, setTermsAccepted] = useState(
    Boolean(state.values?.termsAccepted),
  );
  const [privacyAccepted, setPrivacyAccepted] = useState(
    Boolean(state.values?.privacyAccepted),
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const errorAlertRef = useRef<HTMLDivElement>(null);
  const isRateLimited = state.errorCode === "SIGNUP_RATE_LIMITED";
  const cooldownEmail = state.confirmationEmail || state.values?.email || "";
  const storedCooldownEndsAt = getStoredSignupCooldownEndsAt(cooldownEmail);
  const serverCooldownEndsAt = state.rateLimitCooldownEndsAt || 0;
  const cooldownEndsAt = Math.max(serverCooldownEndsAt, storedCooldownEndsAt);
  const rateLimitSecondsRemaining =
    cooldownEndsAt > 0
      ? Math.max(
          0,
          Math.ceil((cooldownEndsAt - currentTime) / 1000),
        )
      : 0;
  const isSubmitDisabled =
    isPending || (isRateLimited && rateLimitSecondsRemaining > 0);

  const confirmPasswordErrors = passwordMismatch
    ? ["Passwords must match."]
    : state.fieldErrors?.confirmPassword;
  const isDuplicateEmail = isSignupDuplicateEmailError(state.errorCode);
  const isValidationError = isSignupValidationError(state.errorCode);
  const topLevelError =
    !passwordMismatch && state.status === "error" && state.message && !isValidationError
      ? state.message
      : null;

  useEffect(() => {
    if (topLevelError) {
      errorAlertRef.current?.focus();
    }
  }, [topLevelError]);

  useEffect(() => {
    if (!cooldownEmail || serverCooldownEndsAt <= 0) {
      return;
    }

    const nextCooldown = Math.max(serverCooldownEndsAt, storedCooldownEndsAt);
    window.localStorage.setItem(
      getSignupCooldownStorageKey(cooldownEmail),
      String(nextCooldown),
    );
  }, [cooldownEmail, serverCooldownEndsAt, storedCooldownEndsAt]);

  useEffect(() => {
    if (rateLimitSecondsRemaining <= 0) {
      if (cooldownEmail) {
        window.localStorage.removeItem(getSignupCooldownStorageKey(cooldownEmail));
      }
      return;
    }

    const timer = window.setTimeout(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [cooldownEmail, rateLimitSecondsRemaining]);

  return (
    <Card className="rounded-3xl border border-[#D9D7D1]/90 bg-[#FFFFFC]/94 p-5 shadow-[0_22px_70px_rgba(14,26,18,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md sm:p-6">
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
          action={formAction}
          onSubmit={(e) => {
            const form = e.currentTarget;
            const formData = new FormData(form);
            const submittedRole = formData.get("role");
            const password = formData.get("password") as string;
            const confirmPassword = formData.get("confirmPassword") as string;

            if (isSubmitDisabled) {
              e.preventDefault();
              return;
            }

            if (submittedRole !== role) {
              e.preventDefault();
              const roleInput = form.elements.namedItem("role");
              if (roleInput instanceof HTMLInputElement) {
                roleInput.value = role;
              }
              form.requestSubmit();
              return;
            }

            if (password !== confirmPassword) {
              e.preventDefault();
              setPasswordMismatch(true);
              return;
            }

            setPasswordMismatch(false);
          }}
        >
          <FieldGroup className="gap-4 sm:gap-5">
            {topLevelError ? (
              <Alert
                ref={errorAlertRef}
                variant="destructive"
                role="alert"
                aria-live="polite"
                tabIndex={-1}
                className="focus-visible:ring-2 focus-visible:ring-destructive/35 focus-visible:outline-none"
              >
                <AlertCircle />
                <AlertTitle>
                  {isDuplicateEmail ? "Account not created" : "Signup needs attention"}
                </AlertTitle>
                <AlertDescription>
                  {topLevelError}
                  {isDuplicateEmail ? (
                    <span className="mt-3 flex flex-wrap gap-2">
                      <Button asChild variant="outline" size="sm" className="h-8 rounded-lg text-xs font-semibold">
                        <Link href="/login">Sign in instead</Link>
                      </Button>
                      <Button asChild variant="outline" size="sm" className="h-8 rounded-lg text-xs font-semibold">
                        <Link href="/forgot-password">Reset password</Link>
                      </Button>
                    </span>
                  ) : null}
                  {isRateLimited && rateLimitSecondsRemaining > 0 ? (
                    <span className="mt-2 block text-sm font-medium normal-case">
                      Please wait {rateLimitSecondsRemaining} seconds before using resend confirmation.
                    </span>
                  ) : null}
                </AlertDescription>
              </Alert>
            ) : null}

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
              <PasswordInput
                id="password"
                name="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className="h-12 rounded-xl border-[#D9D7D1] bg-[#F8F7F3]/80 text-[#161616] shadow-sm transition-colors placeholder:text-[#77736A] focus-visible:border-[#33423C] focus-visible:ring-[#33423C]/25"
                required
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (passwordMismatch) {
                    setPasswordMismatch(false);
                  }
                }}
              />
              <FieldErrorHelper messages={state.fieldErrors?.password} />
            </Field>

            <Field>
              <FieldLabel htmlFor="confirmPassword" className="text-[#33423C]">Confirm password <span className="text-destructive">*</span></FieldLabel>
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                autoComplete="new-password"
                placeholder="Re-enter your password"
                className="h-12 rounded-xl border-[#D9D7D1] bg-[#F8F7F3]/80 text-[#161616] shadow-sm transition-colors placeholder:text-[#77736A] focus-visible:border-[#33423C] focus-visible:ring-[#33423C]/25"
                required
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  if (passwordMismatch) {
                    setPasswordMismatch(false);
                  }
                }}
              />
              <FieldErrorHelper messages={confirmPasswordErrors} />
            </Field>

            <div className="space-y-3 rounded-2xl border border-[#D9D7D1]/85 bg-[#F8F7F3]/62 p-4" role="group" aria-label="Required disclosures">
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
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked === true)}
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
                  checked={privacyAccepted}
                  onCheckedChange={(checked) => setPrivacyAccepted(checked === true)}
                />
            </div>

            <Field>
              <SubmitButton
                isPending={isPending}
                isDisabled={isSubmitDisabled}
                rateLimitSecondsRemaining={rateLimitSecondsRemaining}
              />
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

function isSignupRole(value: unknown): value is SignupRole {
  return value === "borrower" || value === "lender";
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
          "flex w-full cursor-pointer flex-col items-center gap-2.5 rounded-2xl border px-4 py-4 text-center transition-all duration-200 sm:py-5",
          isSelected
            ? "border-[#33423C] bg-[#0E1A12] text-white shadow-[0_14px_28px_rgba(14,26,18,0.12)] ring-1 ring-[#33423C]/24"
            : "border-[#D9D7D1] bg-[#FFFFFC]/84 text-[#161616] shadow-[0_8px_22px_rgba(14,26,18,0.04)] hover:border-[#C7C4BC] hover:bg-[#F8F7F3]",
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
  checked,
  onCheckedChange,
}: {
  name: string;
  id: string;
  label: React.ReactNode;
  error?: string[];
  checked: boolean;
  onCheckedChange: (checked: boolean | "indeterminate") => void;
}) {
  return (
    <div className="grid gap-1">
      <div className="grid grid-cols-[1.125rem_1fr] items-start gap-x-2.5 gap-y-0">
        <Checkbox
          id={id}
          name={name}
          value="on"
          checked={checked}
          onCheckedChange={onCheckedChange}
          className="mt-0.5 border-[#C7C4BC] data-[state=checked]:border-[#33423C] data-[state=checked]:bg-[#33423C]"
          required
        />
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

function SubmitButton({
  isPending,
  isDisabled,
  rateLimitSecondsRemaining,
}: {
  isPending: boolean;
  isDisabled: boolean;
  rateLimitSecondsRemaining: number;
}) {
  const label = isPending
    ? "Creating account..."
    : rateLimitSecondsRemaining > 0
      ? `Try again in ${rateLimitSecondsRemaining}s`
      : "Create account";

  return (
    <Button
      type="submit"
      disabled={isDisabled}
      className="h-12 w-full rounded-xl border border-[#161616] bg-[#161616] font-semibold !text-white shadow-[0_18px_35px_rgba(14,26,18,0.16)] transition-all hover:bg-[#0E1A12] hover:shadow-[0_20px_40px_rgba(14,26,18,0.2)] focus-visible:outline-[#161616]"
    >
      {label}
    </Button>
  );
}

function getSignupCooldownStorageKey(email: string) {
  return `lendfolio:signup-confirmation-cooldown:${email.trim().toLowerCase()}`;
}

function getStoredSignupCooldownEndsAt(email: string) {
  if (!email || typeof window === "undefined") {
    return 0;
  }

  const storedValue = window.localStorage.getItem(getSignupCooldownStorageKey(email));
  const storedEndsAt = Number(storedValue);

  return Number.isFinite(storedEndsAt) && storedEndsAt > Date.now()
    ? storedEndsAt
    : 0;
}
