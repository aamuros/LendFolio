"use client";

import type { ReactNode } from "react";
import { useActionState, useEffect, useRef } from "react";
import {
  createLoanOffer,
  type CreateLoanOfferState,
} from "@/app/lender/applications/[id]/actions";

type LenderOfferFormProps = {
  applicationId: string;
  requestedAmount: number;
  defaultDueDate: string;
};

export function LenderOfferForm({
  applicationId,
  requestedAmount,
  defaultDueDate,
}: LenderOfferFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const initialState: CreateLoanOfferState = {
    ok: false,
    message: "",
  };
  const [state, formAction, isPending] = useActionState(
    createLoanOffer.bind(null, applicationId),
    initialState,
  );

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
    }
  }, [state.ok]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Approved amount"
          error={state.fieldErrors?.approvedAmount?.[0]}
        >
          <CurrencyInput
            name="approvedAmount"
            defaultValue={requestedAmount}
            disabled={isPending}
          />
        </Field>

        <Field
          label="Repayment amount"
          error={state.fieldErrors?.repaymentAmount?.[0]}
        >
          <CurrencyInput
            name="repaymentAmount"
            defaultValue={requestedAmount}
            disabled={isPending}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Fees" error={state.fieldErrors?.fees?.[0]}>
          <CurrencyInput name="fees" defaultValue={0} disabled={isPending} />
        </Field>

        <Field label="Due date" error={state.fieldErrors?.dueDate?.[0]}>
          <input
            type="date"
            name="dueDate"
            defaultValue={defaultDueDate}
            disabled={isPending}
            className="h-12 w-full rounded-md border border-[var(--border)] bg-white px-3 text-base outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:opacity-70"
          />
        </Field>
      </div>

      <Field label="Remarks" error={state.fieldErrors?.remarks?.[0]}>
        <textarea
          name="remarks"
          rows={4}
          disabled={isPending}
          className="w-full resize-y rounded-md border border-[var(--border)] bg-white px-3 py-3 text-base leading-7 outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:opacity-70"
          placeholder="Optional offer notes for the borrower."
        />
      </Field>

      {state.message ? (
        <div
          className="rounded-md border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 text-[var(--muted-foreground)]"
          role={state.ok ? "status" : "alert"}
        >
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          Offer expiry and active loan creation are deferred; this sends a
          pending offer for borrower review.
        </p>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-12 items-center justify-center rounded-md bg-[var(--primary)] px-5 text-base font-semibold text-[var(--primary-foreground)] transition hover:bg-[#0b5f59] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Sending..." : "Send pending offer"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-[var(--foreground)]">
        {label}
      </span>
      {children}
      {error ? (
        <span className="text-sm leading-5 text-[var(--accent)]">{error}</span>
      ) : null}
    </label>
  );
}

function CurrencyInput({
  name,
  defaultValue,
  disabled,
}: {
  name: string;
  defaultValue: number;
  disabled: boolean;
}) {
  return (
    <div className="flex h-12 overflow-hidden rounded-md border border-[var(--border)] bg-white focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--primary)]/20">
      <span className="grid w-14 place-items-center border-r border-[var(--border)] text-sm font-semibold text-[var(--muted-foreground)]">
        PHP
      </span>
      <input
        type="number"
        min="0"
        step="100"
        inputMode="decimal"
        name={name}
        defaultValue={defaultValue}
        disabled={disabled}
        className="min-w-0 flex-1 px-3 text-base outline-none disabled:cursor-not-allowed disabled:opacity-70"
      />
    </div>
  );
}
