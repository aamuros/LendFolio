"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ReactNode } from "react";
import { useEffect, useState, useTransition } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import {
  loadBorrowerPortfolio,
  saveBorrowerPortfolio,
} from "@/app/borrower/actions";
import {
  borrowerPortfolioSchema,
  businessTypeLabels,
  businessTypeOptions,
  type BorrowerPortfolioInput,
} from "@/lib/borrower-portfolio";
import {
  borrowerPortfolioDraftKey,
  borrowerPortfolioSavedEvent,
} from "@/lib/borrower-demo-storage";

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
  const [saveMessage, setSaveMessage] = useState<string>(
    "Checking for a saved portfolio...",
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<BorrowerPortfolioInput>({
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
          setSaveMessage(result.message);
          return;
        }

        const localDraft = getLocalDraft();

        if (localDraft) {
          reset(localDraft);
          setLoadState("ready");
          setSaveMessage("Loaded the saved device draft for this borrower demo.");
          return;
        }

        setLoadState(result.ok ? "empty" : "error");
        setSaveMessage(result.message);
      });
    });

    return () => {
      isActive = false;
    };
  }, [reset, startTransition]);

  function onSubmit(values: BorrowerPortfolioInput) {
    window.localStorage.setItem(borrowerPortfolioDraftKey, JSON.stringify(values));
    window.dispatchEvent(new Event(borrowerPortfolioSavedEvent));
    setSaveMessage("Saving portfolio...");

    startTransition(async () => {
      const result = await saveBorrowerPortfolio(values);
      setLoadState(result.ok ? "ready" : "error");
      setSaveMessage(result.message);
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid gap-6"
      aria-describedby="portfolio-save-state"
    >
      <div
        className="rounded-md border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 text-[var(--muted-foreground)]"
        role={loadState === "error" ? "alert" : "status"}
      >
        {loadState === "loading"
          ? "Loading any saved borrower portfolio..."
          : saveMessage}
      </div>

      {loadState === "empty" ? (
        <div className="rounded-md border border-dashed border-[var(--border)] px-4 py-4 text-sm leading-6 text-[var(--muted-foreground)]">
          No portfolio has been saved for this borrower yet. Fill out the
          required fields below to create one.
        </div>
      ) : null}

      <div className="grid gap-5 border-y border-[var(--border)] py-6 sm:grid-cols-2">
        <Field label="Business type" error={errors.businessType?.message}>
          <select
            {...register("businessType")}
            className="h-12 w-full rounded-md border border-[var(--border)] bg-white px-3 text-base text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
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
            className="h-12 w-full rounded-md border border-[var(--border)] bg-white px-3 text-base outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            placeholder="Barangay, city or province"
          />
        </Field>

        <Field
          label="Monthly gross revenue"
          error={errors.monthlyGrossRevenue?.message}
        >
          <CurrencyInput
            registration={register("monthlyGrossRevenue", {
              valueAsNumber: true,
            })}
          />
        </Field>

        <Field
          label="Monthly expenses"
          error={errors.monthlyExpenses?.message}
        >
          <CurrencyInput
            registration={register("monthlyExpenses", { valueAsNumber: true })}
          />
        </Field>

        <Field
          label="Existing monthly loan payments"
          error={errors.existingLoanPayments?.message}
        >
          <CurrencyInput
            registration={register("existingLoanPayments", {
              valueAsNumber: true,
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
            {...register("yearsInOperation", { valueAsNumber: true })}
            className="h-12 w-full rounded-md border border-[var(--border)] bg-white px-3 text-base outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </Field>
      </div>

      <Field
        label="Loan purpose context"
        error={errors.loanPurposeContext?.message}
      >
        <textarea
          {...register("loanPurposeContext")}
          rows={6}
          className="w-full resize-y rounded-md border border-[var(--border)] bg-white px-3 py-3 text-base leading-7 outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          placeholder="Describe what the financing would support, such as inventory, equipment, repairs, or working capital."
        />
      </Field>

      <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
        <p
          id="portfolio-save-state"
          className="text-sm leading-6 text-[var(--muted-foreground)]"
          aria-live="polite"
        >
          {loadState === "loading" ? "Loading saved values..." : saveMessage}
          {isDirty ? " Use Save portfolio to update the draft." : ""}
        </p>
        <button
          type="submit"
          disabled={isPending || loadState === "loading"}
          className="inline-flex h-12 items-center justify-center rounded-md bg-[var(--primary)] px-5 text-base font-semibold text-[var(--primary-foreground)] transition hover:bg-[#0b5f59] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Saving..." : "Save portfolio"}
        </button>
      </div>
    </form>
  );
}

function getLocalDraft(): BorrowerPortfolioInput | null {
  const storedDraft = window.localStorage.getItem(borrowerPortfolioDraftKey);

  if (!storedDraft) {
    return null;
  }

  try {
    const parsed = borrowerPortfolioSchema.safeParse(JSON.parse(storedDraft));

    if (parsed.success) {
      return parsed.data;
    }
  } catch {
    window.localStorage.removeItem(borrowerPortfolioDraftKey);
  }

  return null;
}

type FieldProps = {
  label: string;
  error?: string;
  children: ReactNode;
};

function Field({ label, error, children }: FieldProps) {
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

type CurrencyInputProps = {
  registration: UseFormRegisterReturn;
};

function CurrencyInput({ registration }: CurrencyInputProps) {
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
        {...registration}
        className="min-w-0 flex-1 px-3 text-base outline-none"
      />
    </div>
  );
}
