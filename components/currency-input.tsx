"use client";

import type { FocusEvent, InputHTMLAttributes } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";

type CurrencyInputProps = {
  registration?: UseFormRegisterReturn;
  name?: string;
  defaultValue?: number | string;
  disabled?: boolean;
  emptyValue?: number;
  min?: string;
  step?: string;
  className?: string;
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  | "type"
  | "name"
  | "defaultValue"
  | "disabled"
  | "min"
  | "step"
  | "inputMode"
  | "className"
>;

export function CurrencyInput({
  registration,
  name,
  defaultValue,
  disabled = false,
  emptyValue,
  min = "0",
  step = "100",
  className = "",
  onFocus,
  onBlur,
  onChange,
  ...inputProps
}: CurrencyInputProps) {
  const inputName = registration?.name ?? name;

  function handleFocus(event: FocusEvent<HTMLInputElement>) {
    if (event.currentTarget.value.trim() === "0") {
      event.currentTarget.value = "";
    }

    onFocus?.(event);
  }

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    if (event.currentTarget.value.trim() === "" && emptyValue !== undefined) {
      event.currentTarget.value = String(emptyValue);
    }

    registration?.onBlur(event);
    onBlur?.(event);
  }

  return (
    <div
      className={`flex h-12 overflow-hidden rounded-md border border-[var(--border)] bg-white focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--primary)]/20 ${className}`}
    >
      <span className="grid w-14 place-items-center border-r border-[var(--border)] text-sm font-semibold text-[var(--muted-foreground)]">
        PHP
      </span>
      <input
        {...inputProps}
        {...registration}
        ref={registration?.ref}
        type="text"
        min={min}
        step={step}
        inputMode="decimal"
        name={inputName}
        defaultValue={defaultValue}
        disabled={disabled}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={(event) => {
          registration?.onChange(event);
          onChange?.(event);
        }}
        className="min-w-0 flex-1 px-3 text-base outline-none disabled:cursor-not-allowed disabled:opacity-70"
      />
    </div>
  );
}
