"use client";

import type React from "react";
import { useRef } from "react";

export function AutoFilterForm({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function omitEmptyFields(form: HTMLFormElement) {
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
  }

  function submit(form: HTMLFormElement, delay = 0) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      form.requestSubmit();
    }, delay);
  }

  return (
    <form
      className={className}
      onSubmit={(event) => {
        omitEmptyFields(event.currentTarget);
      }}
      onChange={(event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
          return;
        }

        if (target instanceof HTMLSelectElement || target.type === "date") {
          submit(event.currentTarget);
        }
      }}
      onInput={(event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;
        if (target.type === "text" || target.type === "search") {
          submit(event.currentTarget, 350);
        }
      }}
    >
      {children}
    </form>
  );
}
