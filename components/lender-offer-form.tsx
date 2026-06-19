"use client";

import type { ReactNode } from "react";
import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createLoanOffer,
  type CreateLoanOfferState,
} from "@/app/lender/applications/[id]/actions";
import { CurrencyInput } from "@/components/currency-input";
import { LenderOfferHistory } from "@/components/lender-offer-history";
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
import {
  calculatePlatformProcessingFee,
  PLATFORM_PROCESSING_FEE_RATE,
  type LoanOfferSummary,
} from "@/lib/loan-offer";
import { cn } from "@/lib/utils";

type LenderOfferFormProps = {
  applicationId: string;
  requestedAmount: number;
  availableCreditAtSubmission: number | null;
  defaultDueDate: string;
  preferredTerm: string;
  preferredTermLabel: string;
  offers?: LoanOfferSummary[];
  currentLenderId?: string | null;
};

export function LenderOfferForm({
  applicationId,
  requestedAmount,
  availableCreditAtSubmission,
  defaultDueDate,
  preferredTermLabel,
  offers = [],
  currentLenderId = null,
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
  const [interestServiceChargeRate, setInterestServiceChargeRate] =
    useState("10");
  const [fees, setFees] = useState("0");
  const [repaymentChannel, setRepaymentChannel] = useState("");
  const parsedApprovedAmount = parseCurrencyValue(approvedAmount);
  const parsedInterestRate = parseNumberValue(interestServiceChargeRate);
  const interestServiceCharge =
    parsedApprovedAmount * (parsedInterestRate / 100);
  const processingFee = calculatePlatformProcessingFee(parsedApprovedAmount);
  const totalRepaymentAmount =
    parsedApprovedAmount +
    interestServiceCharge +
    parseCurrencyValue(fees) +
    processingFee;

  const maxPrincipal = availableCreditAtSubmission ?? requestedAmount;
  const exceedsAvailableCredit = parsedApprovedAmount > maxPrincipal;
  const exceedsRequestedAmount = parsedApprovedAmount > requestedAmount;
  const hasNegativeInputs =
    parsedApprovedAmount < 0 ||
    parsedInterestRate < 0 ||
    parseCurrencyValue(fees) < 0;

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
        setInterestServiceChargeRate("10");
        setFees("0");
        setRepaymentChannel("");
        setToastMessage(result.message);
        router.refresh();
      }
    });
  }

  return (
    <form
      ref={formRef}
      action={onSubmit}
      className="flex min-h-0 flex-1 flex-col"
    >
      <StatusToast message={toastMessage} onDismiss={dismissToast} />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,22rem)]">
          <div className="grid gap-4">
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <p className="text-sm font-semibold">Borrower credit capacity</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Available credit at submission is{" "}
                <span className="font-semibold text-foreground">
                  PHP {formatCurrency(maxPrincipal)}
                </span>
                . Principal is checked against borrower credit limit. Interest,
                other fees, and the system processing fee are added only to
                repayment.
              </p>
            </div>

            <Section title="Loan terms">
              <div className="grid gap-x-4 gap-y-5 md:grid-cols-2">
                <LoanTermField
                  label="Approved amount (principal)"
                  error={state.fieldErrors?.approvedAmount?.[0]}
                  helper=" "
                >
                  <CurrencyInput
                    name="approvedAmount"
                    defaultValue={requestedAmount}
                    disabled={isPending}
                    onChange={(event) => setApprovedAmount(event.currentTarget.value)}
                  />
                </LoanTermField>

                <LoanTermField
                  label="Interest / service charge rate (%)"
                  error={state.fieldErrors?.interestServiceChargeRate?.[0]}
                  helper={`Charge: PHP ${formatCurrency(interestServiceCharge)}`}
                >
                  <Input
                    type="number"
                    name="interestServiceChargeRate"
                    defaultValue={10}
                    disabled={isPending}
                    min={0}
                    max={100}
                    step="0.01"
                    inputMode="decimal"
                    className="h-9"
                    onChange={(event) =>
                      setInterestServiceChargeRate(event.currentTarget.value)
                    }
                  />
                </LoanTermField>

                <LoanTermField
                  label="Other borrower-paid fees (optional)"
                  error={state.fieldErrors?.fees?.[0]}
                  helper="Use 0 if there are no additional fees."
                >
                  <CurrencyInput
                    name="fees"
                    defaultValue={0}
                    disabled={isPending}
                    emptyValue={0}
                    onChange={(event) => setFees(event.currentTarget.value)}
                  />
                </LoanTermField>

                <LoanTermField
                  label="Final repayment date"
                  error={state.fieldErrors?.dueDate?.[0]}
                  helper={`Borrower prefers ${preferredTermLabel}. Earlier installments are spaced monthly.`}
                >
                  <Input
                    type="date"
                    name="dueDate"
                    defaultValue={defaultDueDate}
                    disabled={isPending}
                    className="h-9"
                  />
                </LoanTermField>
              </div>
            </Section>

            <Section title="Remarks">
              <Field
                label="Offer note"
                error={state.fieldErrors?.remarks?.[0]}
                visuallyHideLabel
              >
                <Textarea
                  name="remarks"
                  rows={3}
                  disabled={isPending}
                  placeholder="Optional offer notes for the borrower."
                  className="min-h-[84px] resize-none"
                />
              </Field>
            </Section>

            <Section
              title="Repayment destination"
              description="These details will be shown to the borrower and saved with the active loan."
            >
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
            </Section>
          </div>

          <aside className="grid w-full gap-4 self-start">
            <RepaymentSummary
              approvedAmount={parsedApprovedAmount}
              interestRate={parsedInterestRate}
              interestServiceCharge={interestServiceCharge}
              fees={parseCurrencyValue(fees)}
              processingFee={processingFee}
              totalRepaymentAmount={totalRepaymentAmount}
            />
            <LenderOfferHistory
              offers={offers}
              compact
              currentLenderId={currentLenderId}
            />
          </aside>
        </div>

        <div className="mt-4 grid gap-2">
          {exceedsRequestedAmount ? (
            <p
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm leading-6 text-destructive"
              role="alert"
            >
              Approved amount cannot exceed the borrower&apos;s requested amount of
              PHP {formatCurrency(requestedAmount)}.
            </p>
          ) : null}

          {exceedsAvailableCredit ? (
            <p
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm leading-6 text-destructive"
              role="alert"
            >
              Approved principal cannot exceed the borrower&apos;s available credit
              of PHP {formatCurrency(maxPrincipal)}.
            </p>
          ) : null}

          {state.message && !state.ok ? (
            <p
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm leading-6 text-destructive"
              role="alert"
            >
              {state.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid shrink-0 gap-2 border-t border-border bg-popover px-4 py-3 sm:flex sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-baseline justify-between gap-3 sm:grid sm:justify-start sm:gap-0.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Total repayment
          </span>
          <span className="text-lg font-semibold">
            PHP {formatCurrency(totalRepaymentAmount)}
          </span>
        </div>
        <Button
          type="submit"
          disabled={
            isPending ||
            exceedsAvailableCredit ||
            exceedsRequestedAmount ||
            hasNegativeInputs
          }
          className="h-11 rounded-full font-semibold sm:ml-auto"
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

function parseNumberValue(value: string) {
  const parsed = Number(value.trim());

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value) + "%";
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-2 rounded-lg border border-border bg-background px-3 py-3">
      <div className="grid gap-0.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description ? (
          <p className="text-xs leading-5 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function RepaymentSummary({
  approvedAmount,
  interestRate,
  interestServiceCharge,
  fees,
  processingFee,
  totalRepaymentAmount,
}: {
  approvedAmount: number;
  interestRate: number;
  interestServiceCharge: number;
  fees: number;
  processingFee: number;
  totalRepaymentAmount: number;
}) {
  return (
    <section className="rounded-lg border border-border bg-muted/30 px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">Total repayment summary</p>
        <p className="text-lg font-semibold">
          PHP {formatCurrency(totalRepaymentAmount)}
        </p>
      </div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Calculated from principal, interest/service charge, other fees, and
        system processing fee.
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm lg:grid-cols-1">
        <div>
          <dt className="text-xs text-muted-foreground">Approved principal</dt>
          <dd className="font-semibold">PHP {formatCurrency(approvedAmount)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Interest rate</dt>
          <dd className="font-semibold">{formatPercent(interestRate)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Interest/service charge</dt>
          <dd className="font-semibold">
            PHP {formatCurrency(interestServiceCharge)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Other borrower-paid fees</dt>
          <dd className="font-semibold">PHP {formatCurrency(fees)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">
            System processing fee ({formatPercent(PLATFORM_PROCESSING_FEE_RATE * 100)})
          </dt>
          <dd className="font-semibold">PHP {formatCurrency(processingFee)}</dd>
        </div>
      </dl>
    </section>
  );
}

function LoanTermField({
  label,
  error,
  helper,
  children,
}: {
  label: string;
  error?: string;
  helper: string;
  children: ReactNode;
}) {
  return (
    <div className="grid content-start gap-2">
      <Label className="text-sm font-semibold">{label}</Label>
      {children}
      {error ? (
        <p className="min-h-6 text-sm leading-6 text-destructive">{error}</p>
      ) : (
        <p className="min-h-6 text-sm leading-6 text-muted-foreground">
          {helper}
        </p>
      )}
    </div>
  );
}

function Field({
  label,
  error,
  visuallyHideLabel = false,
  children,
}: {
  label: string;
  error?: string;
  visuallyHideLabel?: boolean;
  children: ReactNode;
}) {
  return (
    <Label className="grid gap-1.5">
      <span className={cn("text-sm font-semibold", visuallyHideLabel && "sr-only")}>
        {label}
      </span>
      {children}
      {error ? (
        <span className="text-sm leading-5 text-destructive">{error}</span>
      ) : null}
    </Label>
  );
}
