import type { ChangeEvent } from "react";
import { TextField } from "@/app/signup/form-fields";
import {
  PasswordStrengthIndicator,
  type PasswordStrength,
} from "@/app/signup/password-strength-indicator";
import type { SignupState } from "@/app/signup/actions";

export function AccountCredentialsFields({
  state,
  displayName,
  email,
  password,
  confirmPassword,
  passwordMismatch,
  passwordStrength,
  onDisplayNameChange,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
}: {
  state: SignupState;
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
  passwordMismatch: string;
  passwordStrength: PasswordStrength;
  onDisplayNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onEmailChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPasswordChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onConfirmPasswordChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="grid gap-4 border-t border-[var(--border)] pt-5">
      <div className="grid gap-1">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">
          Account credentials
        </h2>
        <p className="text-sm leading-5 text-[var(--muted-foreground)]">
          Use these details to sign in after your account is created.
        </p>
      </div>

      <TextField
        label="Full name"
        name="displayName"
        autoComplete="name"
        value={displayName}
        onChange={onDisplayNameChange}
        error={state.fieldErrors?.displayName}
      />

      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={onEmailChange}
        error={state.fieldErrors?.email}
      />

      <TextField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={onPasswordChange}
        error={state.fieldErrors?.password}
      />
      <PasswordStrengthIndicator password={password} strength={passwordStrength} />

      <TextField
        label="Confirm password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={onConfirmPasswordChange}
        error={
          passwordMismatch ? [passwordMismatch] : state.fieldErrors?.confirmPassword
        }
      />
    </div>
  );
}
