"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { signupAction, type SignupState } from "@/app/signup/actions";
import type { SignupRole } from "@/lib/signup";

const initialState: SignupState = {
  message: "",
  status: "idle",
};

export function SignupForm() {
  const [state, formAction] = useActionState(signupAction, initialState);
  const [role, setRole] = useState<SignupRole>("borrower");
  const isSuccess = state.status === "success";

  return (
    <form action={formAction} className="grid gap-5">
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium text-[var(--foreground)]">
          Account type
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <RoleOption
            label="Borrower"
            value="borrower"
            checked={role === "borrower"}
            onChange={setRole}
          />
          <RoleOption
            label="Lender"
            value="lender"
            checked={role === "lender"}
            onChange={setRole}
          />
        </div>
        <FieldError messages={state.fieldErrors?.role} />
      </fieldset>

      <TextField
        label="Full name"
        name="displayName"
        autoComplete="name"
        error={state.fieldErrors?.displayName}
      />

      {role === "lender" ? (
        <TextField
          label="Organization"
          name="organizationName"
          autoComplete="organization"
          error={state.fieldErrors?.organizationName}
        />
      ) : null}

      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        error={state.fieldErrors?.email}
      />

      <TextField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        error={state.fieldErrors?.password}
      />

      <TextField
        label="Confirm password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        error={state.fieldErrors?.confirmPassword}
      />

      {state.message ? (
        <p
          className={`border-l-2 px-4 py-3 text-sm leading-6 ${
            isSuccess
              ? "border-[var(--primary)] bg-[#edf5f1] text-[#244a3c]"
              : "border-[var(--accent)] bg-[var(--background)] text-[var(--muted-foreground)]"
          }`}
          role={isSuccess ? "status" : "alert"}
        >
          {state.message}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}

function RoleOption({
  label,
  value,
  checked,
  onChange,
}: {
  label: string;
  value: SignupRole;
  checked: boolean;
  onChange: (role: SignupRole) => void;
}) {
  return (
    <label
      className={`grid min-h-12 cursor-pointer place-items-center rounded-md border px-3 text-sm font-semibold transition ${
        checked
          ? "border-[var(--primary)] bg-[var(--primary)] text-white"
          : "border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[var(--primary)]"
      }`}
    >
      <input
        className="sr-only"
        type="radio"
        name="role"
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
      />
      {label}
    </label>
  );
}

function TextField({
  label,
  name,
  type = "text",
  autoComplete,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  error?: string[];
}) {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium text-[var(--foreground)]" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        className="h-12 w-full rounded-md border border-[var(--border)] bg-white px-3.5 text-base outline-none transition-colors placeholder:text-[var(--subtle-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
        required={name !== "organizationName"}
      />
      <FieldError messages={error} />
    </div>
  );
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) {
    return null;
  }

  return (
    <p className="text-sm leading-6 text-red-700" role="alert">
      {messages[0]}
    </p>
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
      {pending ? "Creating account..." : "Create account"}
    </button>
  );
}
