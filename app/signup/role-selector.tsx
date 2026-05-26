import { FieldError } from "@/app/signup/form-fields";
import type { SignupState } from "@/app/signup/actions";
import type { SignupRole } from "@/lib/signup";

export function RoleSelector({
  role,
  state,
  onChange,
}: {
  role: SignupRole;
  state: SignupState;
  onChange: (role: SignupRole) => void;
}) {
  return (
    <fieldset className="grid gap-2.5">
      <legend className="text-sm font-medium text-[var(--foreground)]">
        Account type
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        <RoleOption
          label="Borrower"
          description="Create a profile and manage loan documents."
          value="borrower"
          checked={role === "borrower"}
          onChange={onChange}
        />
        <RoleOption
          label="Lender"
          description="Submit your organization for access review."
          value="lender"
          checked={role === "lender"}
          onChange={onChange}
        />
      </div>
      <FieldError messages={state.fieldErrors?.role} />
    </fieldset>
  );
}

function RoleOption({
  label,
  description,
  value,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  value: SignupRole;
  checked: boolean;
  onChange: (role: SignupRole) => void;
}) {
  return (
    <label
      className={`grid cursor-pointer grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-md border px-3.5 py-3 text-left transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-[var(--primary)] ${
        checked
          ? "border-[var(--primary)] bg-[var(--foreground)]/[0.03] shadow-[0_1px_0_rgba(255,255,255,0.75)_inset]"
          : "border-[var(--border)] bg-white/60 hover:border-[var(--muted-foreground)] hover:bg-white/85"
      }`}
    >
      <input
        className="mt-0.5 h-4 w-4 accent-[var(--primary)] focus:ring-[var(--primary)]"
        type="radio"
        name="role"
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
      />
      <span className="text-sm font-semibold text-[var(--foreground)]">
        {label}
      </span>
      <span className="col-start-2 text-sm leading-5 text-[var(--muted-foreground)]">
        {description}
      </span>
    </label>
  );
}
