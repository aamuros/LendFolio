"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MailCheck } from "lucide-react";
import {
  resendSignupConfirmationAction,
  type ResendSignupConfirmationState,
} from "@/app/signup/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  acknowledgeAuthFlow,
  AUTH_FLOW_STORAGE_KEY,
} from "@/lib/auth-flow-sync";

const initialResendState: ResendSignupConfirmationState = {
  message: "",
  status: "idle",
};

const INITIAL_RESEND_COOLDOWN_MS = 60_000;

export function SignupConfirmationPanel({
  email,
}: {
  email: string;
}) {
  const router = useRouter();
  const [resendState, resendFormAction, isResendPending] = useActionState(
    resendSignupConfirmationAction,
    initialResendState,
  );
  const [currentTime, setCurrentTime] = useState(0);
  const [initialCooldownEndsAt, setInitialCooldownEndsAt] = useState(0);
  const serverCooldownEndsAt = resendState.rateLimitCooldownEndsAt || 0;
  const cooldownEndsAt = Math.max(serverCooldownEndsAt, initialCooldownEndsAt);
  const rateLimitSecondsRemaining =
    cooldownEndsAt > 0
      ? Math.max(0, Math.ceil((cooldownEndsAt - currentTime) / 1000))
      : 0;
  const isTimerInitializing = currentTime === 0;
  const isCoolingDown = isTimerInitializing || rateLimitSecondsRemaining > 0;

  useEffect(() => {
    function completeConfirmation() {
      acknowledgeAuthFlow("email-confirmed");
      router.replace("/login?message=email-confirmed");
      router.refresh();
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === AUTH_FLOW_STORAGE_KEY && event.newValue?.includes("email-confirmed")) {
        completeConfirmation();
      }
    }

    function handleChannel(event: MessageEvent) {
      if (event.data === "email-confirmed") {
        channel?.postMessage("email-confirmed:ack");
        completeConfirmation();
      }
    }

    const channel = "BroadcastChannel" in window
      ? new BroadcastChannel(AUTH_FLOW_STORAGE_KEY)
      : null;
    channel?.addEventListener("message", handleChannel);
    window.addEventListener("storage", handleStorage);

    return () => {
      channel?.close();
      window.removeEventListener("storage", handleStorage);
    };
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const now = Date.now();
      const storedCooldownEndsAt = getStoredSignupCooldownEndsAt(email);
      setCurrentTime(now);
      setInitialCooldownEndsAt(
        Math.max(storedCooldownEndsAt, now + INITIAL_RESEND_COOLDOWN_MS),
      );
    }, 0);

    return () => window.clearTimeout(timer);
  }, [email]);

  useEffect(() => {
    if (!email || cooldownEndsAt <= 0) {
      return;
    }

    window.localStorage.setItem(
      getSignupCooldownStorageKey(email),
      String(cooldownEndsAt),
    );
  }, [cooldownEndsAt, email]);

  useEffect(() => {
    if (currentTime === 0) {
      return;
    }

    if (rateLimitSecondsRemaining <= 0) {
      window.localStorage.removeItem(getSignupCooldownStorageKey(email));
      return;
    }

    const timer = window.setTimeout(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [currentTime, email, rateLimitSecondsRemaining]);

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
                ? `Resend in ${isTimerInitializing ? 60 : rateLimitSecondsRemaining}s`
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
      {isCoolingDown ? (
        <p className="text-center text-sm text-muted-foreground" aria-live="polite">
          You can request another email in{" "}
          {isTimerInitializing ? 60 : rateLimitSecondsRemaining} seconds.
        </p>
      ) : null}
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
