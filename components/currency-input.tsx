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
      className={`flex h-9 w-full min-w-0 overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 [&:has([aria-invalid=true])]:border-destructive [&:has([aria-invalid=true])]:ring-destructive/20 ${className}`}
    >
      <span className="grid w-14 place-items-center border-r border-input text-sm font-semibold text-muted-foreground">
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
        className="min-w-0 flex-1 bg-transparent px-3 py-1 text-base outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
      />
    </div>
  );
}
