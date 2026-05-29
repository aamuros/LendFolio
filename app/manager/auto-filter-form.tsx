"use client";

import type React from "react";
import { useCallback, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SELECT_EMPTY_VALUE = "__any__";

export function SelectFilter({
  label,
  name,
  defaultValue,
  options,
  emptyLabel = "Any",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: Array<{ value: string; label: string }>;
  emptyLabel?: string;
}) {
  const hiddenRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue ?? "");

  function handleChange(next: string) {
    const resolved = next === SELECT_EMPTY_VALUE ? "" : next;
    setValue(resolved);
    if (hiddenRef.current) {
      hiddenRef.current.value = resolved;
      hiddenRef.current.dispatchEvent(
        new Event("change", { bubbles: true }),
      );
    }
  }

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={`${name}-select`} className="text-xs font-medium">
        {label}
      </Label>
      <input ref={hiddenRef} type="hidden" name={name} value={value} />
      <Select value={value || SELECT_EMPTY_VALUE} onValueChange={handleChange}>
        <SelectTrigger id={`${name}-select`} className="w-full">
          <SelectValue placeholder={emptyLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SELECT_EMPTY_VALUE}>{emptyLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function AutoFilterForm({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget;
    const disabledFields: Array<HTMLInputElement | HTMLSelectElement> = [];
    const fields = form.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
      "input[name], select[name]",
    );

    fields.forEach((field) => {
      if (field.value.trim() === "") {
        field.disabled = true;
        disabledFields.push(field);
      }
    });

    window.requestAnimationFrame(() => {
      disabledFields.forEach((field) => {
        field.disabled = false;
      });
    });
  }, []);

  const handleChange = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    const target = event.target;
    if (
      !(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)
    ) {
      return;
    }

    if (
      target instanceof HTMLSelectElement ||
      target.type === "date" ||
      target.type === "hidden"
    ) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      event.currentTarget.requestSubmit();
    }
  }, []);

  const handleInput = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.type === "text" || target.type === "search") {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        event.currentTarget.requestSubmit();
      }, 350);
    }
  }, []);

  return (
    <form
      className={className}
      onSubmit={handleSubmit}
      onChange={handleChange}
      onInput={handleInput}
    >
      {children}
    </form>
  );
}

export function FilterForm({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  const handleSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget;
    const disabledFields: Array<HTMLInputElement | HTMLSelectElement> = [];
    const fields = form.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
      "input[name], select[name]",
    );

    fields.forEach((field) => {
      if (field.value.trim() === "") {
        field.disabled = true;
        disabledFields.push(field);
      }
    });

    window.requestAnimationFrame(() => {
      disabledFields.forEach((field) => {
        field.disabled = false;
      });
    });
  }, []);

  return (
    <form className={className} onSubmit={handleSubmit}>
      {children}
    </form>
  );
}
