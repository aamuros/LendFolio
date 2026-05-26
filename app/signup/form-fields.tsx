import type { ChangeEvent } from "react";

export function TextField({
  label,
  name,
  type = "text",
  autoComplete,
  required = true,
  min,
  step,
  helperText,
  defaultValue,
  value,
  onChange,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  min?: string;
  step?: string;
  helperText?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  error?: string[];
}) {
  const errorId = `${name}-error`;

  return (
    <div className="grid gap-2">
      <label
        className="text-sm font-medium text-[var(--foreground)]"
        htmlFor={name}
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        min={min}
        step={step}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
        aria-describedby={error?.length ? errorId : undefined}
        aria-invalid={error?.length ? true : undefined}
        className="h-12 w-full rounded-md border border-[var(--border)] bg-white px-3.5 text-base outline-none transition-colors placeholder:text-[var(--subtle-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
        required={required}
      />
      {helperText ? (
        <p className="text-sm leading-5 text-[var(--muted-foreground)]">
          {helperText}
        </p>
      ) : null}
      <FieldError id={errorId} messages={error} />
    </div>
  );
}

export function TextAreaField({
  label,
  name,
  helperText,
  defaultValue,
  error,
}: {
  label: string;
  name: string;
  helperText?: string;
  defaultValue?: string;
  error?: string[];
}) {
  const errorId = `${name}-error`;

  return (
    <div className="grid gap-2">
      <label
        className="text-sm font-medium text-[var(--foreground)]"
        htmlFor={name}
      >
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={5}
        defaultValue={defaultValue}
        aria-describedby={error?.length ? errorId : undefined}
        aria-invalid={error?.length ? true : undefined}
        className="w-full resize-y rounded-md border border-[var(--border)] bg-white px-3.5 py-3 text-base outline-none transition-colors placeholder:text-[var(--subtle-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
        required
      />
      {helperText ? (
        <p className="text-sm leading-5 text-[var(--muted-foreground)]">
          {helperText}
        </p>
      ) : null}
      <FieldError id={errorId} messages={error} />
    </div>
  );
}

export function FieldError({
  id,
  messages,
}: {
  id?: string;
  messages?: string[];
}) {
  if (!messages?.length) {
    return null;
  }

  return (
    <p id={id} className="text-sm leading-6 text-red-700" role="alert">
      {messages[0]}
    </p>
  );
}
