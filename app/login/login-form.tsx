"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "@/app/login/actions";

const initialState: LoginState = {
  message: "",
};

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="grid gap-5">
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
          autoComplete="current-password"
          className="h-12 w-full rounded-md border border-[var(--border)] bg-white px-3.5 text-base outline-none transition-colors placeholder:text-[var(--subtle-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
          placeholder="Enter your password"
          required
        />
      </div>

      {state.message ? (
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
