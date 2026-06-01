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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type LenderOfferFormProps = {
  applicationId: string;
  requestedAmount: number;
  availableCreditAtSubmission: number | null;
  defaultDueDate: string;
  preferredTerm: string;
  preferredTermLabel: string;
};

export function LenderOfferForm({
  applicationId,
  requestedAmount,
  availableCreditAtSubmission,
  defaultDueDate,
  preferredTermLabel,
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
  const [repaymentChannel, setRepaymentChannel] = useState("");
  const totalRepaymentAmount =
    parseCurrencyValue(approvedAmount) +
    parseCurrencyValue(interestServiceCharge) +
    parseCurrencyValue(fees);

  const maxTotalRepayment =
    availableCreditAtSubmission ?? requestedAmount;
  const remainingCredit = maxTotalRepayment - totalRepaymentAmount;
  const exceedsAvailableCredit = totalRepaymentAmount > maxTotalRepayment;
  const parsedApprovedAmount = parseCurrencyValue(approvedAmount);
  const exceedsRequestedAmount = parsedApprovedAmount > requestedAmount;

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
        setRepaymentChannel("");
        setToastMessage(result.message);
        router.refresh();
      }
    });
  }

  return (
    <form ref={formRef} action={onSubmit} className="grid gap-3">
      <StatusToast message={toastMessage} onDismiss={dismissToast} />

      <div className="rounded-xl border border-border bg-muted/30 px-3 py-3">
        <p className="text-sm font-semibold">Borrower credit capacity</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          This borrower&apos;s available credit at submission is{" "}
          <span className="font-semibold text-foreground">
            PHP {formatCurrency(maxTotalRepayment)}
          </span>
          . Total repayment cannot exceed this amount.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Approved amount (principal)"
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
        <Field label="Other borrower-paid fees (optional)" error={state.fieldErrors?.fees?.[0]}>
          <CurrencyInput
            name="fees"
            defaultValue={0}
            disabled={isPending}
            emptyValue={0}
            onChange={(event) => setFees(event.currentTarget.value)}
          />
          <span className="text-xs text-muted-foreground">
            Use 0 if there are no additional fees.
          </span>
        </Field>

        <Field label="Final repayment date" error={state.fieldErrors?.dueDate?.[0]}>
          <Input
            type="date"
            name="dueDate"
            defaultValue={defaultDueDate}
            disabled={isPending}
            className="h-9"
          />
          <span className="text-xs text-muted-foreground">
            The borrower prefers {preferredTermLabel}. This date sets the final
            installment due date. Earlier installments are spaced monthly.
          </span>
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
        <p className="text-sm font-semibold">Repayment destination</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Tell the borrower where to send the repayment. These details will be
          shown to the borrower and saved with the active loan.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Repayment channel"
          error={state.fieldErrors?.repaymentChannel?.[0]}
        >
          <input type="hidden" name="repaymentChannel" value={repaymentChannel} />
          <Select
            value={repaymentChannel}
            onValueChange={setRepaymentChannel}
            disabled={isPending}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Select channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GCash">GCash</SelectItem>
              <SelectItem value="Maya">Maya</SelectItem>
              <SelectItem value="BPI">BPI</SelectItem>
              <SelectItem value="BDO">BDO</SelectItem>
              <SelectItem value="Metrobank">Metrobank</SelectItem>
              <SelectItem value="UnionBank">UnionBank</SelectItem>
              <SelectItem value="Landbank">Landbank</SelectItem>
              <SelectItem value="BDO Online">BDO Online</SelectItem>
              <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
              <SelectItem value="Cash">Cash</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="Account name"
          error={state.fieldErrors?.repaymentAccountName?.[0]}
        >
          <Input
            name="repaymentAccountName"
            disabled={isPending}
            placeholder="Account holder name"
            className="h-9"
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Account / wallet number"
          error={state.fieldErrors?.repaymentAccountNumber?.[0]}
        >
          <Input
            name="repaymentAccountNumber"
            disabled={isPending}
            placeholder="Account or wallet number"
            className="h-9"
          />
        </Field>

        <Field
          label="Additional instructions (optional)"
          error={state.fieldErrors?.repaymentInstructions?.[0]}
        >
          <Input
            name="repaymentInstructions"
            disabled={isPending}
            placeholder="e.g. Include loan ID in the note"
            className="h-9"
          />
        </Field>
      </div>

      <div className="rounded-xl border border-border bg-muted/30 px-3 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">Total repayment</p>
          <p
            className={cn(
              "text-lg font-semibold",
              exceedsAvailableCredit && "text-destructive",
            )}
          >
            PHP {formatCurrency(totalRepaymentAmount)}
          </p>
        </div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Total repayment is calculated from the approved amount, interest/service charge,
          and other fees. Borrower installments will add up to this total.
        </p>
        <dl className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Available credit</dt>
            <dd className="font-semibold">
              PHP {formatCurrency(maxTotalRepayment)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Remaining after repayment</dt>
            <dd
              className={cn(
                "font-semibold",
                remainingCredit < 0 && "text-destructive",
              )}
            >
              PHP {formatCurrency(remainingCredit)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Room for charges</dt>
            <dd className="font-semibold">
              PHP{" "}
              {formatCurrency(
                Math.max(0, maxTotalRepayment - parseCurrencyValue(approvedAmount)),
              )}
            </dd>
          </div>
        </dl>
      </div>

      {exceedsRequestedAmount ? (
        <p
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm leading-6 text-destructive"
          role="alert"
        >
          Approved amount cannot exceed the borrower&apos;s requested amount of
          PHP {formatCurrency(requestedAmount)}.
        </p>
      ) : null}

      {exceedsAvailableCredit ? (
        <p
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm leading-6 text-destructive"
          role="alert"
        >
          Total repayment exceeds the borrower&apos;s available credit. Reduce the
          approved amount, interest/service charge, or fees.
        </p>
      ) : null}

      {state.message && !state.ok ? (
        <p
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm leading-6 text-destructive"
          role="alert"
        >
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-3 pt-1 sm:flex sm:items-center sm:justify-end">
        <Button
          type="submit"
          disabled={isPending || exceedsAvailableCredit || exceedsRequestedAmount}
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
