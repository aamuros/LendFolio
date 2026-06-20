"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import {
  resendSignupConfirmationAction,
  type ResendSignupConfirmationState,
} from "@/app/signup/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const initialResendState: ResendSignupConfirmationState = {
  message: "",
  status: "idle",
};

export function SignupConfirmationPanel({ email }: { email: string }) {
  const [resendState, resendFormAction, isResendPending] = useActionState(
    resendSignupConfirmationAction,
    initialResendState,
  );
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const storedCooldownEndsAt = getStoredSignupCooldownEndsAt(email);
  const serverCooldownEndsAt = resendState.rateLimitCooldownEndsAt || 0;
  const cooldownEndsAt = Math.max(serverCooldownEndsAt, storedCooldownEndsAt);
  const rateLimitSecondsRemaining =
    cooldownEndsAt > 0
      ? Math.max(0, Math.ceil((cooldownEndsAt - currentTime) / 1000))
      : 0;
  const isCoolingDown = rateLimitSecondsRemaining > 0;

  useEffect(() => {
    if (!email || serverCooldownEndsAt <= 0) {
      return;
    }

    window.localStorage.setItem(
      getSignupCooldownStorageKey(email),
      String(Math.max(serverCooldownEndsAt, storedCooldownEndsAt)),
    );
  }, [email, serverCooldownEndsAt, storedCooldownEndsAt]);

  useEffect(() => {
    if (rateLimitSecondsRemaining <= 0) {
      window.localStorage.removeItem(getSignupCooldownStorageKey(email));
      return;
    }

    const timer = window.setTimeout(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [email, rateLimitSecondsRemaining]);

  return (
    <div className="grid gap-3 rounded-2xl border border-[#D9D7D1]/85 bg-[#F8F7F3]/62 p-4">
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
                Try again in {rateLimitSecondsRemaining} seconds.
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
            className="h-11 w-full rounded-xl font-semibold"
          >
            {isResendPending
              ? "Sending..."
              : isCoolingDown
                ? `Resend in ${rateLimitSecondsRemaining}s`
                : "Resend confirmation"}
          </Button>
        </form>
        <Button
          asChild
          variant="outline"
          className="h-11 rounded-xl font-semibold"
        >
          <Link href="/login">Go to login</Link>
        </Button>
      </div>
    </div>
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
