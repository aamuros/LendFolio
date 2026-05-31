"use client";

import type { ReactNode } from "react";
import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createLoanOffer,
  type CreateLoanOfferState,
} from "@/app/lender/applications/[id]/actions";
import { CurrencyInput } from "@/components/currency-input";
import { StatusToast } from "@/components/status-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const initialState: CreateLoanOfferState = {
    ok: false,
    message: "",
  };
  const [state, setState] = useState<CreateLoanOfferState>(initialState);
  const [isPending, startTransition] = useTransition();
  const [toastMessage, setToastMessage] = useState("");
  const [approvedAmount, setApprovedAmount] = useState(String(requestedAmount));
  const [interestServiceCharge, setInterestServiceCharge] = useState("0");
  const [fees, setFees] = useState("0");
  const totalRepaymentAmount =
    parseCurrencyValue(approvedAmount) +
    parseCurrencyValue(interestServiceCharge) +
    parseCurrencyValue(fees);

  const dismissToast = useCallback(() => {
    setToastMessage("");
  }, []);

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createLoanOffer(applicationId, initialState, formData);
      setState(result);

      if (result.ok) {
        formRef.current?.reset();
        setApprovedAmount(String(requestedAmount));
        setInterestServiceCharge("0");
        setFees("0");
        setToastMessage(result.message);
        router.refresh();
      }
    });
  }

  return (
    <form ref={formRef} action={onSubmit} className="grid gap-3">
      <StatusToast message={toastMessage} onDismiss={dismissToast} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Approved amount"
          error={state.fieldErrors?.approvedAmount?.[0]}
        >
          <CurrencyInput
            name="approvedAmount"
            defaultValue={requestedAmount}
            disabled={isPending}
            onChange={(event) => setApprovedAmount(event.currentTarget.value)}
          />
        </Field>

        <Field
          label="Interest / service charge"
          error={state.fieldErrors?.interestServiceCharge?.[0]}
        >
          <CurrencyInput
            name="interestServiceCharge"
            defaultValue={0}
            disabled={isPending}
            emptyValue={0}
            onChange={(event) =>
              setInterestServiceCharge(event.currentTarget.value)
            }
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
            onChange={(event) => setFees(event.currentTarget.value)}
          />
        </Field>

        <Field label="Due date" error={state.fieldErrors?.dueDate?.[0]}>
          <Input
            type="date"
            name="dueDate"
            defaultValue={defaultDueDate}
            disabled={isPending}
            className="h-9"
          />
        </Field>
      </div>

      <Field label="Remarks" error={state.fieldErrors?.remarks?.[0]}>
        <Textarea
          name="remarks"
          rows={4}
          disabled={isPending}
          placeholder="Optional offer notes for the borrower."
        />
      </Field>

      <div className="rounded-xl border border-border bg-muted/30 px-3 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">Total repayment</p>
          <p className="text-lg font-semibold">
            PHP {formatCurrency(totalRepaymentAmount)}
          </p>
        </div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Total repayment is calculated from the approved amount, interest/service charge,
          and fees. Borrower installments will add up to this total.
        </p>
      </div>

      {state.message && !state.ok ? (
        <p
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm leading-6 text-destructive"
          role="alert"
        >
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-3 pt-1 sm:flex sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-muted-foreground">
          The borrower can review and accept this offer.
        </p>
        <Button
          type="submit"
          disabled={isPending}
          className="h-11 rounded-full font-semibold"
        >
          {isPending ? "Sending..." : "Send offer"}
        </Button>
      </div>
    </form>
  );
}

function parseCurrencyValue(value: string) {
  const parsed = Number(value.replace(/,/g, "").trim());

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
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
    <Label className="grid gap-1.5">
      <span className="text-sm font-semibold">{label}</span>
      {children}
      {error ? (
        <span className="text-sm leading-5 text-destructive">{error}</span>
      ) : null}
    </Label>
  );
}
