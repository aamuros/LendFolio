"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ReactNode } from "react";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  loadBorrowerPortfolio,
  saveBorrowerPortfolio,
} from "@/app/borrower/actions";
import { CurrencyInput } from "@/components/currency-input";
import {
  borrowerPortfolioSchema,
  businessTypeLabels,
  businessTypeOptions,
  type BorrowerPortfolioFormInput,
  type BorrowerPortfolioInput,
} from "@/lib/borrower-portfolio";
import { borrowerPortfolioSavedEvent } from "@/lib/borrower-workflow-events";
import { parseMoneyInput } from "@/lib/money-input";

const defaultValues: BorrowerPortfolioInput = {
  businessType: "sari_sari_store",
  location: "",
  monthlyGrossRevenue: 0,
  monthlyExpenses: 0,
  existingLoanPayments: 0,
  yearsInOperation: 0,
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
    formState: { errors, isDirty },
  } = useForm<BorrowerPortfolioFormInput, unknown, BorrowerPortfolioInput>({
    resolver: zodResolver(borrowerPortfolioSchema),
    defaultValues,
    mode: "onBlur",
  });

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

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business type" error={errors.businessType?.message}>
          <select
            {...register("businessType")}
            className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-base text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          >
            {businessTypeOptions.map((option) => (
              <option key={option} value={option}>
                {businessTypeLabels[option]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Business location" error={errors.location?.message}>
          <input
            {...register("location")}
            className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-base outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            placeholder="Barangay, city or province"
          />
        </Field>

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
            className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-base outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </Field>
      </div>

      <Field
        label="Loan purpose context"
        error={errors.loanPurposeContext?.message}
      >
        <textarea
          {...register("loanPurposeContext")}
          rows={3}
          className="w-full resize-y rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-base leading-6 outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
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
