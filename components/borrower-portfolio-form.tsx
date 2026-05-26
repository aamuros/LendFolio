"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ReactNode } from "react";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useWatch } from "react-hook-form";
import {
  loadBorrowerPortfolio,
  saveBorrowerPortfolio,
} from "@/app/borrower/actions";
import { CurrencyInput } from "@/components/currency-input";
import {
  borrowerPortfolioSchema,
  businessTypeLabels,
  businessTypeOptions,
  operatingModelLabels,
  operatingModelOptions,
  primarySalesChannelLabels,
  primarySalesChannelOptions,
  revenueConfidenceLabels,
  revenueConfidenceOptions,
  revenuePeriodLabels,
  revenuePeriodOptions,
  type BorrowerPortfolioFormInput,
  type BorrowerPortfolioInput,
} from "@/lib/borrower-portfolio";
import { evaluateBorrowerReadiness } from "@/lib/borrower-readiness";
import { explainBorrowerCreditLimit } from "@/lib/credit-limit";
import { borrowerPortfolioSavedEvent } from "@/lib/borrower-workflow-events";
import { parseMoneyInput } from "@/lib/money-input";

const defaultValues: BorrowerPortfolioInput = {
  businessName: "",
  businessDescription: "",
  businessType: "sari_sari_store",
  startedOperatingAt: "",
  businessAddress: "",
  barangay: "",
  cityOrMunicipality: "",
  province: "",
  location: "",
  operatingModel: "fixed_store",
  primarySalesChannel: "walk_in",
  revenuePeriod: "last_30_days",
  revenueConfidence: "self_declared",
  monthlyGrossRevenue: 0,
  monthlyExpenses: 0,
  existingLoanPayments: 0,
  yearsInOperation: 0,
  inventoryExpense: 0,
  rentExpense: 0,
  payrollExpense: 0,
  utilitiesExpense: 0,
  otherExpense: 0,
  debtLenderCount: 0,
  totalOutstandingDebt: 0,
  debtNotes: "",
  loanPurposeContext: "",
};

type LoadState = "loading" | "empty" | "ready" | "error";

export function BorrowerPortfolioForm() {
  const [isPending, startTransition] = useTransition();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<BorrowerPortfolioFormInput, unknown, BorrowerPortfolioInput>({
    resolver: zodResolver(borrowerPortfolioSchema),
    defaultValues,
    mode: "onBlur",
  });
  const currentValues = useWatch({ control }) as BorrowerPortfolioInput;
  const readiness = evaluateBorrowerReadiness(currentValues);
  const credit = explainBorrowerCreditLimit(currentValues);

  useEffect(() => {
    let isActive = true;

    startTransition(() => {
      void loadBorrowerPortfolio().then((result) => {
        if (!isActive) {
          return;
        }

        if (result.ok && result.data) {
          reset(result.data);
          setLoadState("ready");
          setStatusMessage("");
          setSuccessMessage("");
          return;
        }

        setLoadState(result.ok ? "empty" : "error");
        setStatusMessage(result.message);
        setSuccessMessage("");
      });
    });

    return () => {
      isActive = false;
    };
  }, [reset, startTransition]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setSuccessMessage(""), 3000);

    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  function onSubmit(values: BorrowerPortfolioInput) {
    setStatusMessage("Saving profile...");
    setSuccessMessage("");

    startTransition(async () => {
      const result = await saveBorrowerPortfolio(values);
      setLoadState(result.ok ? "ready" : "error");
      if (result.ok) {
        setStatusMessage("");
        setSuccessMessage(result.message);
        reset(values);
        window.dispatchEvent(new Event(borrowerPortfolioSavedEvent));
      } else {
        setStatusMessage(result.message);
      }
    });
  }

  if (loadState === "loading") {
    return <BorrowerPortfolioFormSkeleton />;
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      onChange={() => {
        if (successMessage) {
          setSuccessMessage("");
        }
      }}
      className="grid gap-4 rounded-3xl border border-[var(--border)] bg-white px-4 py-4 shadow-sm sm:px-5"
      aria-describedby="portfolio-save-state"
    >
      {loadState === "error" ? (
        <div
          className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm leading-6 text-[var(--muted-foreground)]"
          role="alert"
        >
          {statusMessage}
        </div>
      ) : null}

      {loadState === "empty" ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm leading-6 text-[var(--muted-foreground)]">
          Add your business details to continue.
        </div>
      ) : null}

      <ReadinessPanel
        readiness={readiness}
        monthlyNetCashFlow={credit.monthlyNetCashFlow}
      />

      <FormSection title="Business identity">
        <Field label="Business name" error={errors.businessName?.message}>
          <input {...register("businessName")} className={inputClassName} />
        </Field>
        <Field label="Business type" error={errors.businessType?.message}>
          <select {...register("businessType")} className={selectClassName}>
            {businessTypeOptions.map((option) => (
              <option key={option} value={option}>
                {businessTypeLabels[option]}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Business description"
          error={errors.businessDescription?.message}
        >
          <textarea
            {...register("businessDescription")}
            rows={3}
            className={textareaClassName}
            placeholder="Describe what the business sells or provides."
          />
        </Field>
        <Field
          label="Business start date"
          error={errors.startedOperatingAt?.message}
        >
          <input
            type="date"
            {...register("startedOperatingAt")}
            className={inputClassName}
          />
        </Field>
      </FormSection>

      <FormSection title="Business location">
        <Field label="Business address" error={errors.businessAddress?.message}>
          <input {...register("businessAddress")} className={inputClassName} />
        </Field>
        <Field label="Barangay" error={errors.barangay?.message}>
          <input {...register("barangay")} className={inputClassName} />
        </Field>
        <Field
          label="City or municipality"
          error={errors.cityOrMunicipality?.message}
        >
          <input {...register("cityOrMunicipality")} className={inputClassName} />
        </Field>
        <Field label="Province" error={errors.province?.message}>
          <input {...register("province")} className={inputClassName} />
        </Field>
        <Field label="Business location" error={errors.location?.message}>
          <input
            {...register("location")}
            className={inputClassName}
            placeholder="Barangay, city or province"
          />
        </Field>
      </FormSection>

      <FormSection title="Operations">
        <Field label="Operating model" error={errors.operatingModel?.message}>
          <select {...register("operatingModel")} className={selectClassName}>
            {operatingModelOptions.map((option) => (
              <option key={option} value={option}>
                {operatingModelLabels[option]}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Primary sales channel"
          error={errors.primarySalesChannel?.message}
        >
          <select
            {...register("primarySalesChannel")}
            className={selectClassName}
          >
            {primarySalesChannelOptions.map((option) => (
              <option key={option} value={option}>
                {primarySalesChannelLabels[option]}
              </option>
            ))}
          </select>
        </Field>
      </FormSection>

      <FormSection title="Financial snapshot">
        <Field
          label="Monthly gross revenue"
          error={errors.monthlyGrossRevenue?.message}
        >
          <CurrencyInput
            className="h-11 rounded-xl"
            registration={register("monthlyGrossRevenue", {
              setValueAs: parseMoneyInput,
            })}
          />
        </Field>

        <Field label="Revenue period" error={errors.revenuePeriod?.message}>
          <select {...register("revenuePeriod")} className={selectClassName}>
            {revenuePeriodOptions.map((option) => (
              <option key={option} value={option}>
                {revenuePeriodLabels[option]}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Revenue confidence"
          error={errors.revenueConfidence?.message}
        >
          <select {...register("revenueConfidence")} className={selectClassName}>
            {revenueConfidenceOptions.map((option) => (
              <option key={option} value={option}>
                {revenueConfidenceLabels[option]}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Monthly expenses"
          error={errors.monthlyExpenses?.message}
        >
          <CurrencyInput
            className="h-11 rounded-xl"
            registration={register("monthlyExpenses", {
              setValueAs: parseMoneyInput,
            })}
          />
        </Field>

        <Field
          label="Existing monthly loan payments"
          error={errors.existingLoanPayments?.message}
        >
          <CurrencyInput
            className="h-11 rounded-xl"
            registration={register("existingLoanPayments", {
              setValueAs: parseMoneyInput,
            })}
          />
        </Field>

        <Field
          label="Years in operation"
          error={errors.yearsInOperation?.message}
        >
          <input
            type="number"
            min="0"
            max="100"
            step="0.5"
            inputMode="decimal"
            {...register("yearsInOperation", { setValueAs: parseMoneyInput })}
            className={inputClassName}
          />
        </Field>
      </FormSection>

      <FormSection title="Expense breakdown">
        <MoneyField
          label="Inventory or cost of goods"
          error={errors.inventoryExpense?.message}
        >
          <CurrencyInput
            className="h-11 rounded-xl"
            registration={register("inventoryExpense", {
              setValueAs: parseMoneyInput,
            })}
          />
        </MoneyField>
        <MoneyField label="Rent" error={errors.rentExpense?.message}>
          <CurrencyInput
            className="h-11 rounded-xl"
            registration={register("rentExpense", { setValueAs: parseMoneyInput })}
          />
        </MoneyField>
        <MoneyField label="Payroll" error={errors.payrollExpense?.message}>
          <CurrencyInput
            className="h-11 rounded-xl"
            registration={register("payrollExpense", {
              setValueAs: parseMoneyInput,
            })}
          />
        </MoneyField>
        <MoneyField label="Utilities" error={errors.utilitiesExpense?.message}>
          <CurrencyInput
            className="h-11 rounded-xl"
            registration={register("utilitiesExpense", {
              setValueAs: parseMoneyInput,
            })}
          />
        </MoneyField>
        <MoneyField label="Other expenses" error={errors.otherExpense?.message}>
          <CurrencyInput
            className="h-11 rounded-xl"
            registration={register("otherExpense", {
              setValueAs: parseMoneyInput,
            })}
          />
        </MoneyField>
      </FormSection>

      <FormSection title="Debt obligations">
        <Field label="Active lenders" error={errors.debtLenderCount?.message}>
          <input
            type="number"
            min="0"
            step="1"
            {...register("debtLenderCount", { setValueAs: parseMoneyInput })}
            className={inputClassName}
          />
        </Field>
        <Field
          label="Total outstanding debt"
          error={errors.totalOutstandingDebt?.message}
        >
          <CurrencyInput
            className="h-11 rounded-xl"
            registration={register("totalOutstandingDebt", {
              setValueAs: parseMoneyInput,
            })}
          />
        </Field>
        <Field label="Debt notes" error={errors.debtNotes?.message}>
          <textarea
            {...register("debtNotes")}
            rows={2}
            className={textareaClassName}
          />
        </Field>
      </FormSection>

      <Field
        label="Loan purpose context"
        error={errors.loanPurposeContext?.message}
      >
        <textarea
          {...register("loanPurposeContext")}
          rows={3}
          className={textareaClassName}
          placeholder="Describe what the financing would support, such as inventory, equipment, repairs, or working capital."
        />
      </Field>

      <div className="grid gap-3 border-t border-[var(--border)] pt-4 sm:flex sm:items-center sm:justify-between">
        <div className="grid gap-2">
          <p
            id="portfolio-save-state"
            className="text-sm leading-6 text-[var(--muted-foreground)]"
            aria-live="polite"
          >
            {statusMessage}
            {isDirty ? " Save changes when ready." : ""}
          </p>
          {successMessage ? (
            <p
              className="rounded-xl bg-[#edf5f1] px-3 py-2 text-sm font-medium text-[#244a3c]"
              role="status"
            >
              {successMessage}
            </p>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--primary)] px-5 text-base font-semibold text-[var(--primary-foreground)] transition hover:bg-[#0f0f0f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Saving..." : "Save profile"}
        </button>
      </div>
    </form>
  );
}

const inputClassName =
  "h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-base outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20";
const selectClassName =
  "h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-base text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20";
const textareaClassName =
  "w-full resize-y rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-base leading-6 outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20";

function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3">
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function ReadinessPanel({
  readiness,
  monthlyNetCashFlow,
}: {
  readiness: ReturnType<typeof evaluateBorrowerReadiness>;
  monthlyNetCashFlow: number;
}) {
  return (
    <section className="grid gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm leading-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">Profile readiness</p>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold capitalize text-[var(--muted-foreground)]">
          {readiness.readinessStatus.replaceAll("_", " ")}
        </span>
      </div>
      <p className="text-[var(--muted-foreground)]">
        Monthly net cash flow: PHP{" "}
        {new Intl.NumberFormat("en-PH", { maximumFractionDigits: 0 }).format(
          monthlyNetCashFlow,
        )}
      </p>
      {readiness.missingFields.length ? (
        <p className="text-[var(--muted-foreground)]">
          Missing: {readiness.missingFields.slice(0, 4).join(", ")}
          {readiness.missingFields.length > 4 ? "..." : ""}
        </p>
      ) : null}
      {readiness.riskFlags.length ? (
        <p className="text-[var(--muted-foreground)]">
          Flags:{" "}
          {readiness.riskFlags
            .map((flag) => flag.replaceAll("_", " "))
            .join(", ")}
        </p>
      ) : null}
      <p className="font-medium">{readiness.nextActions[0]}</p>
    </section>
  );
}

function MoneyField({ label, error, children }: FieldProps) {
  return (
    <Field label={label} error={error}>
      {children}
    </Field>
  );
}

function BorrowerPortfolioFormSkeleton() {
  return (
    <section
      className="grid gap-4 rounded-3xl border border-[var(--border)] bg-white px-4 py-4 shadow-sm sm:px-5"
      aria-busy="true"
      aria-label="Loading business profile"
    >
      <div className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3">
        <SkeletonBlock className="h-4 w-28" />
        <SkeletonBlock className="h-3 w-full max-w-sm" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="grid gap-1.5">
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>

      <div className="grid gap-1.5">
        <SkeletonBlock className="h-4 w-36" />
        <SkeletonBlock className="h-[5.75rem] w-full rounded-xl" />
      </div>

      <div className="grid gap-3 border-t border-[var(--border)] pt-4 sm:flex sm:items-center sm:justify-between">
        <div className="grid gap-2">
          <SkeletonBlock className="h-4 w-48" />
          <SkeletonBlock className="h-4 w-32" />
        </div>
        <SkeletonBlock className="h-12 w-full rounded-full sm:w-36" />
      </div>
    </section>
  );
}

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-full bg-[var(--muted)] ${className}`}
    />
  );
}

type FieldProps = {
  label: string;
  error?: string;
  children: ReactNode;
};

function Field({ label, error, children }: FieldProps) {
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
