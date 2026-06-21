"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  lenderRegisterAction,
  type LenderRegisterState,
} from "@/app/lender/register/actions";
import {
  resendSignupConfirmationAction,
  type ResendSignupConfirmationState,
} from "@/app/signup/actions";
import { isSignupDuplicateEmailError, isSignupRateLimitedError, isSignupConfirmationSendFailedError, isSignupValidationError } from "@/lib/auth-signup-errors";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LegalDialog } from "@/components/legal/legal-dialog";
import { termsContent, privacyContent } from "@/components/legal/legal-content";
import { AlertCircle, MailCheck } from "lucide-react";

const initialState: LenderRegisterState = {
  message: "",
  status: "idle",
};

const initialResendState: ResendSignupConfirmationState = {
  message: "",
  status: "idle",
};

export function LenderRegisterForm() {
  const [state, serverAction, isPending] = useActionState(
    lenderRegisterAction,
    initialState,
  );
  const [resendState, resendFormAction, isResendPending] = useActionState(
    resendSignupConfirmationAction,
    initialResendState,
  );

  return (
    <LenderRegisterFormContent
      state={state}
      serverAction={serverAction}
      isPending={isPending}
      resendState={resendState}
      resendFormAction={resendFormAction}
      isResendPending={isResendPending}
    />
  );
}

function LenderRegisterFormContent({
  state,
  serverAction,
  isPending,
  resendState,
  resendFormAction,
  isResendPending,
}: {
  state: LenderRegisterState;
  serverAction: (payload: FormData) => void;
  isPending: boolean;
  resendState: ResendSignupConfirmationState;
  resendFormAction: (payload: FormData) => void;
  isResendPending: boolean;
}) {
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(
    Boolean(state.values?.termsAccepted),
  );
  const [privacyAccepted, setPrivacyAccepted] = useState(
    Boolean(state.values?.privacyAccepted),
  );
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const errorAlertRef = useRef<HTMLDivElement>(null);
  const isSuccess = state.status === "success";
  const isRateLimited = isSignupRateLimitedError(state.errorCode);
  const isDuplicateEmail = isSignupDuplicateEmailError(state.errorCode);
  const isValidationError = isSignupValidationError(state.errorCode);
  const resendEmail =
    state.confirmationEmail || state.values?.email || resendState.confirmationEmail || "";
  const shouldShowResendConfirmation =
    Boolean(resendEmail) &&
    (Boolean(state.canResendConfirmation) ||
      isSignupConfirmationSendFailedError(state.errorCode) ||
      isSignupRateLimitedError(state.errorCode));
  const serverCooldownEndsAt =
    state.rateLimitCooldownEndsAt || resendState.rateLimitCooldownEndsAt || 0;
  const storedCooldownEndsAt = getStoredCooldownEndsAt(resendEmail);
  const cooldownEndsAt = Math.max(serverCooldownEndsAt, storedCooldownEndsAt);
  const rateLimitSecondsRemaining =
    cooldownEndsAt > 0
      ? Math.max(0, Math.ceil((cooldownEndsAt - currentTime) / 1000))
      : 0;
  const isSubmitDisabled =
    isPending || isResendPending || (isRateLimited && rateLimitSecondsRemaining > 0);
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
    if (!resendEmail || serverCooldownEndsAt <= 0) {
      return;
    }

    const nextCooldown = Math.max(serverCooldownEndsAt, storedCooldownEndsAt);
    window.localStorage.setItem(
      getCooldownStorageKey(resendEmail),
      String(nextCooldown),
    );
  }, [resendEmail, serverCooldownEndsAt, storedCooldownEndsAt]);

  useEffect(() => {
    if (rateLimitSecondsRemaining <= 0) {
      if (resendEmail) {
        window.localStorage.removeItem(getCooldownStorageKey(resendEmail));
      }
      return;
    }

    const timer = window.setTimeout(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resendEmail, rateLimitSecondsRemaining]);

  if (isSuccess) {
    return (
      <Card>
        <CardHeader className="items-center text-center">
          <div className="mx-auto mb-1 flex size-10 items-center justify-center rounded-full bg-muted">
            <MailCheck className="size-5" />
          </div>
          <CardTitle className="text-xl">
            {state.confirmationEmail ? "Check your email" : "Account created"}
          </CardTitle>
          <CardDescription>
            {state.confirmationEmail ? (
              <>
                We sent a confirmation link to{" "}
                <span className="break-all font-medium text-foreground">
                  {state.confirmationEmail}
                </span>
                .
              </>
            ) : (
              "Your account is ready for sign in."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Alert>
            <MailCheck className="size-4" />
            <AlertTitle>
              {state.confirmationEmail ? "Confirm your account" : "Continue"}
            </AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
          {state.canResendConfirmation && state.confirmationEmail ? (
            <ResendActions
              email={state.confirmationEmail}
              resendState={resendState}
              resendFormAction={resendFormAction}
              isResendPending={isResendPending}
              rateLimitSecondsRemaining={rateLimitSecondsRemaining}
            />
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2">
            <Button asChild className="w-full">
              <Link href="/login">Go to sign in</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">Back to home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

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
          <form
            action={serverAction}
            onSubmit={(e) => {
              const form = e.currentTarget;
              const formData = new FormData(form);
              const pw = formData.get("password") as string;
              const cpw = formData.get("confirmPassword") as string;

              if (isSubmitDisabled) {
                e.preventDefault();
                return;
              }

              if (pw !== cpw) {
                e.preventDefault();
                setPasswordMismatch(true);
                return;
              }

              setPasswordMismatch(false);
            }}
          >
            <FieldGroup>
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
                        <Button asChild variant="outline" size="sm" className="h-8 text-xs font-semibold">
                          <Link href="/login">Sign in instead</Link>
                        </Button>
                        <Button asChild variant="outline" size="sm" className="h-8 text-xs font-semibold">
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
                      placeholder="At least 8 characters"
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (passwordMismatch) setPasswordMismatch(false);
                      }}
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
                      placeholder="Re-enter your password"
                      required
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (passwordMismatch) setPasswordMismatch(false);
                      }}
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
                          <button type="button" className="underline underline-offset-4 hover:text-primary">
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

          {shouldShowResendConfirmation ? (
            <div className="mt-4">
              <ResendActions
                email={resendEmail}
                resendState={resendState}
                resendFormAction={resendFormAction}
                isResendPending={isResendPending}
                rateLimitSecondsRemaining={rateLimitSecondsRemaining}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function ResendActions({
  email,
  resendState,
  resendFormAction,
  isResendPending,
  rateLimitSecondsRemaining,
}: {
  email: string;
  resendState: ResendSignupConfirmationState;
  resendFormAction: (payload: FormData) => void;
  isResendPending: boolean;
  rateLimitSecondsRemaining: number;
}) {
  const isCoolingDown = rateLimitSecondsRemaining > 0;

  return (
    <div className="grid gap-3 rounded-lg border bg-muted/35 p-4">
      {resendState.message ? (
        <Alert
          variant={resendState.status === "error" ? "destructive" : "default"}
          role="alert"
          aria-live="polite"
        >
          <MailCheck className="size-4" />
          <AlertTitle>
            {resendState.status === "error" ? "Resend needs attention" : "Confirmation email"}
          </AlertTitle>
          <AlertDescription>
            {resendState.message}
            {isCoolingDown ? (
              <span className="mt-2 block text-sm font-medium">
                Please wait {rateLimitSecondsRemaining} seconds before trying again.
              </span>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <form action={resendFormAction}>
          <input type="hidden" name="email" value={email} />
          <Button
            type="submit"
            variant="outline"
            disabled={isResendPending || isCoolingDown}
            className="h-11 w-full font-semibold"
          >
            {isResendPending
              ? "Sending..."
              : isCoolingDown
                ? `Resend in ${rateLimitSecondsRemaining}s`
                : "Resend confirmation email"}
          </Button>
        </form>
        <Button asChild variant="outline" className="h-11 font-semibold">
          <Link href="/login">Go to login</Link>
        </Button>
      </div>
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
      <div className="grid grid-cols-[1.125rem_1fr] items-start gap-x-2.5">
        <Checkbox
          id={id}
          name={name}
          value="on"
          checked={checked}
          onCheckedChange={onCheckedChange}
          className="mt-0.5"
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
    <Button type="submit" disabled={isDisabled} className="w-full">
      {label}
    </Button>
  );
}

function getCooldownStorageKey(email: string) {
  return `lendfolio:signup-confirmation-cooldown:${email.trim().toLowerCase()}`;
}

function getStoredCooldownEndsAt(email: string) {
  if (!email || typeof window === "undefined") {
    return 0;
  }

  const storedValue = window.localStorage.getItem(getCooldownStorageKey(email));
  const storedEndsAt = Number(storedValue);

  return Number.isFinite(storedEndsAt) && storedEndsAt > Date.now()
    ? storedEndsAt
    : 0;
}
