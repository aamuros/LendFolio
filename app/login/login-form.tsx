"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "@/app/login/actions";

const initialState: LoginState = {
  message: "",
};

type LoginFormProps = {
  signedOut?: boolean;
};

export function LoginForm({ signedOut = false }: LoginFormProps) {
  const [state, formAction] = useActionState(loginAction, initialState);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formVersion, setFormVersion] = useState(0);
  const [submittedVersion, setSubmittedVersion] = useState(0);
  const [showSignedOut, setShowSignedOut] = useState(signedOut);
  const showError = Boolean(state.message && formVersion === submittedVersion);

  useEffect(() => {
    if (!signedOut) {
      return;
    }

    router.replace("/login", { scroll: false });
    const timeout = window.setTimeout(() => setShowSignedOut(false), 3000);

    return () => window.clearTimeout(timeout);
  }, [router, signedOut]);

  function markEdited() {
    setFormVersion((current) => current + 1);
    setShowSignedOut(false);
  }

  return (
    <form
      action={formAction}
      className="grid gap-5"
      onSubmit={() => setSubmittedVersion(formVersion)}
    >
      {showSignedOut ? (
        <p
          className="inline-flex w-fit items-center gap-2 rounded-full bg-[#edf5f1] px-3 py-1.5 text-sm font-medium text-[#244a3c]"
          role="status"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          >
            <path d="m5 12 4 4L19 6" />
          </svg>
          Signed out
        </p>
      ) : null}

      <div className="grid gap-2">
        <label
          className="text-sm font-medium text-[var(--foreground)]"
          htmlFor="email"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            markEdited();
          }}
          autoComplete="email"
          className="h-12 w-full rounded-md border border-[var(--border)] bg-white px-3.5 text-base outline-none transition-colors placeholder:text-[var(--subtle-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
          placeholder="you@example.com"
          required
        />
      </div>

      <div className="grid gap-2">
        <label
          className="text-sm font-medium text-[var(--foreground)]"
          htmlFor="password"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            markEdited();
          }}
          autoComplete="current-password"
          className="h-12 w-full rounded-md border border-[var(--border)] bg-white px-3.5 text-base outline-none transition-colors placeholder:text-[var(--subtle-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
          placeholder="Enter your password"
          required
        />
      </div>

      {showError ? (
        <p
          className="border-l-2 border-[var(--accent)] bg-[var(--background)] px-4 py-3 text-sm leading-6 text-[var(--muted-foreground)]"
          role="alert"
        >
          {state.message}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-1 h-12 rounded-md bg-[var(--primary)] px-4 text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.18)_inset] transition-colors hover:bg-[#161616] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Signing in..." : "Sign in"}
    </button>
  );
}
