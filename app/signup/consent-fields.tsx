import type { ChangeEvent, ReactNode } from "react";
import Link from "next/link";
import { FieldError } from "@/app/signup/form-fields";
import type { SignupState } from "@/app/signup/actions";

export function ConsentFields({
  state,
  termsAccepted,
  privacyAccepted,
  onTermsChange,
  onPrivacyChange,
}: {
  state: SignupState;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  onTermsChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPrivacyChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <fieldset className="grid gap-3">
      <legend className="sr-only">Required disclosures</legend>
      <ConsentCheckbox
        name="termsAccepted"
        label={
          <>
            I agree to the LendFolio{" "}
            <Link
              href="/terms"
              className="font-medium underline underline-offset-4 transition-colors hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
            >
              Terms of Service
            </Link>
            .
          </>
        }
        error={state.fieldErrors?.termsAccepted}
        checked={termsAccepted}
        onChange={onTermsChange}
      />
      <ConsentCheckbox
        name="privacyAccepted"
        label={
          <>
            I acknowledge the LendFolio{" "}
            <Link
              href="/privacy"
              className="font-medium underline underline-offset-4 transition-colors hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
            >
              Privacy Notice
            </Link>
            .
          </>
        }
        error={state.fieldErrors?.privacyAccepted}
        checked={privacyAccepted}
        onChange={onPrivacyChange}
      />
    </fieldset>
  );
}

function ConsentCheckbox({
  name,
  label,
  error,
  checked,
  onChange,
}: {
  name: string;
  label: ReactNode;
  error?: string[];
  checked: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="grid gap-2">
      <label className="flex items-start gap-3 text-sm leading-6 text-[var(--foreground)]">
        <input
          className="mt-1 h-4 w-4 rounded accent-[var(--primary)] focus:ring-[var(--primary)]"
          type="checkbox"
          name={name}
          value="on"
          checked={checked}
          onChange={onChange}
          required
        />
        <span>{label}</span>
      </label>
      <FieldError messages={error} />
    </div>
  );
}
