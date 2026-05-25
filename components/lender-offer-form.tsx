"use client";

import type { ReactNode } from "react";
import { useCallback, useRef, useState, useTransition } from "react";
import {
  createLoanOffer,
  type CreateLoanOfferState,
} from "@/app/lender/applications/[id]/actions";
import { CurrencyInput } from "@/components/currency-input";
import { StatusToast } from "@/components/status-toast";

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
  const [state, setState] = useState<CreateLoanOfferState>(initialState);
  const [isPending, startTransition] = useTransition();
  const [toastMessage, setToastMessage] = useState("");

  const dismissToast = useCallback(() => {
    setToastMessage("");
  }, []);

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createLoanOffer(applicationId, initialState, formData);
      setState(result);

      if (result.ok) {
        formRef.current?.reset();
        setToastMessage(result.message);
      }
    });
  }

  return (
    <form ref={formRef} action={onSubmit} className="grid gap-3">
      <StatusToast message={toastMessage} onDismiss={dismissToast} />
      <input type="hidden" name="requestedAmount" value={requestedAmount} />
      <div className="grid gap-3 sm:grid-cols-2">
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

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Fees" error={state.fieldErrors?.fees?.[0]}>
          <CurrencyInput
            name="fees"
            defaultValue={0}
            disabled={isPending}
            emptyValue={0}
          />
        </Field>

        <Field label="Due date" error={state.fieldErrors?.dueDate?.[0]}>
          <input
            type="date"
            name="dueDate"
            defaultValue={defaultDueDate}
            disabled={isPending}
            className="h-12 w-full rounded-2xl border border-[var(--border)] bg-white px-3 text-base outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:opacity-70"
          />
        </Field>
      </div>

      <Field label="Remarks" error={state.fieldErrors?.remarks?.[0]}>
        <textarea
          name="remarks"
          rows={4}
          disabled={isPending}
          className="w-full resize-y rounded-2xl border border-[var(--border)] bg-white px-3 py-3 text-base leading-7 outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:opacity-70"
          placeholder="Optional offer notes for the borrower."
        />
      </Field>

      {state.message && !state.ok ? (
        <div
          className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 text-[var(--muted-foreground)]"
          role="alert"
        >
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-3 pt-1 sm:flex sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          The borrower can review and accept this offer.
        </p>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--primary)] px-5 text-base font-semibold !text-white transition hover:bg-[#0b5f59] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Sending..." : "Send offer"}
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
    <label className="grid gap-1.5">
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
