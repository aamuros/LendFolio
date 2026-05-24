"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import {
  acceptLoanOffer,
  type BorrowerLoanApplicationSummary,
  loadBorrowerLoanApplications,
  submitLoanApplication,
} from "@/app/borrower/actions";
import {
  borrowerLoanApplicationsDraftKey,
  borrowerPortfolioDraftKey,
  borrowerPortfolioSavedEvent,
} from "@/lib/borrower-demo-storage";
import {
  loanApplicationSchema,
  preferredTermLabels,
  preferredTermOptions,
  type LoanApplicationInput,
} from "@/lib/loan-application";

const defaultValues: LoanApplicationInput = {
  requestedAmount: 0,
  purpose: "",
  preferredTerm: "3_months",
  remarks: "",
};

type LoadState = "loading" | "ready" | "blocked" | "error";

export function BorrowerLoanApplicationPanel() {
  const [isPending, startTransition] = useTransition();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [hasPortfolio, setHasPortfolio] = useState(false);
  const [message, setMessage] = useState("Checking portfolio and applications...");
  const [applications, setApplications] = useState<
    BorrowerLoanApplicationSummary[]
  >([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LoanApplicationInput>({
    resolver: zodResolver(loanApplicationSchema),
    defaultValues,
    mode: "onBlur",
  });

  useEffect(() => {
    let isActive = true;

    function load() {
      startTransition(() => {
        void loadBorrowerLoanApplications().then((result) => {
          if (!isActive) {
            return;
          }

          const localHasPortfolio = hasLocalPortfolioDraft();
          const localApplications = getLocalApplications();
          const nextHasPortfolio = result.hasPortfolio || localHasPortfolio;
          const nextApplications =
            result.ok && result.mode === "supabase"
              ? result.applications
              : localApplications;

          setHasPortfolio(nextHasPortfolio);
          setApplications(nextApplications);
          setLoadState(nextHasPortfolio ? "ready" : "blocked");
          setMessage(
            nextHasPortfolio
              ? result.message
              : "Save your borrower portfolio before submitting a loan application.",
          );
        });
      });
    }

    load();
    window.addEventListener(borrowerPortfolioSavedEvent, load);

    return () => {
      isActive = false;
      window.removeEventListener(borrowerPortfolioSavedEvent, load);
    };
  }, [startTransition]);

  const applicationCountLabel = useMemo(() => {
    if (applications.length === 1) {
      return "1 submitted application";
    }

    return `${applications.length} submitted applications`;
  }, [applications.length]);

  function onSubmit(values: LoanApplicationInput) {
    if (!hasPortfolio) {
      setLoadState("blocked");
      setMessage("Save your borrower portfolio before submitting a loan application.");
      return;
    }

    setMessage("Submitting loan application...");

    startTransition(async () => {
      const result = await submitLoanApplication(values);

      if (result.ok) {
        setApplications((current) => [
          { ...result.application, offers: [] },
          ...current,
        ]);
        setLoadState("ready");
        setMessage(result.message);
        reset(defaultValues);
        return;
      }

      if (result.mode === "local-placeholder") {
        const localApplication = toLocalApplication(values);
        setApplications((current) => {
          const nextApplications = [localApplication, ...current];
          window.localStorage.setItem(
            borrowerLoanApplicationsDraftKey,
            JSON.stringify(nextApplications),
          );
          return nextApplications;
        });
        setLoadState("ready");
        setMessage(result.message);
        reset(defaultValues);
        return;
      }

      setLoadState(result.mode === "missing-portfolio" ? "blocked" : "error");
      setMessage(result.message);
    });
  }

  function onAcceptOffer(applicationId: string, offerId: string) {
    setMessage("Accepting offer...");

    startTransition(async () => {
      const result = await acceptLoanOffer(offerId);

      if (!result.ok) {
        setLoadState("error");
        setMessage(result.message);
        return;
      }

      setApplications((current) =>
        current.map((application) => {
          if (application.id !== applicationId) {
            return application;
          }

          return {
            ...application,
            offers: application.offers.map((offer) => {
              if (offer.id === offerId) {
                return { ...offer, status: "accepted" };
              }

              if (offer.status === "pending") {
                return { ...offer, status: "declined" };
              }

              return offer;
            }),
          };
        }),
      );
      setLoadState("ready");
      setMessage(result.message);
    });
  }

  return (
    <section className="grid gap-6 border-t border-[var(--border)] pt-8">
      <div className="grid gap-3">
        <p className="text-sm font-semibold text-[var(--accent)]">
          Loan request
        </p>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="grid gap-2">
            <h2 className="text-2xl leading-tight font-semibold">
              Submit one loan application
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
              This Sprint 1 request uses the saved borrower portfolio. Credit
              limit checks stay as a later mocked guard.
            </p>
          </div>
          <p className="text-sm font-semibold text-[var(--muted-foreground)]">
            {applicationCountLabel}
          </p>
        </div>
      </div>

      <div
        className="rounded-md border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 text-[var(--muted-foreground)]"
        role={loadState === "error" || loadState === "blocked" ? "alert" : "status"}
      >
        {loadState === "loading" ? "Loading loan application status..." : message}
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid gap-5"
        aria-describedby="loan-application-state"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Requested amount" error={errors.requestedAmount?.message}>
            <CurrencyInput
              registration={register("requestedAmount", { valueAsNumber: true })}
            />
          </Field>

          <Field label="Preferred term" error={errors.preferredTerm?.message}>
            <select
              {...register("preferredTerm")}
              className="h-12 w-full rounded-md border border-[var(--border)] bg-white px-3 text-base text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              {preferredTermOptions.map((option) => (
                <option key={option} value={option}>
                  {preferredTermLabels[option]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Purpose" error={errors.purpose?.message}>
          <input
            {...register("purpose")}
            className="h-12 w-full rounded-md border border-[var(--border)] bg-white px-3 text-base outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            placeholder="Inventory restock, equipment, working capital"
          />
        </Field>

        <Field label="Remarks" error={errors.remarks?.message}>
          <textarea
            {...register("remarks")}
            rows={4}
            className="w-full resize-y rounded-md border border-[var(--border)] bg-white px-3 py-3 text-base leading-7 outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            placeholder="Optional notes for the lender demo review."
          />
        </Field>

        <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
          <p
            id="loan-application-state"
            className="text-sm leading-6 text-[var(--muted-foreground)]"
            aria-live="polite"
          >
            Accepted offers remain offer records only; active loans start in a later sprint.
          </p>
          <button
            type="submit"
            disabled={isPending || loadState === "loading" || !hasPortfolio}
            className="inline-flex h-12 items-center justify-center rounded-md bg-[var(--primary)] px-5 text-base font-semibold text-[var(--primary-foreground)] transition hover:bg-[#0b5f59] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? "Submitting..." : "Submit application"}
          </button>
        </div>
      </form>

      <div className="grid gap-3">
        <h3 className="text-lg font-semibold">Borrower applications</h3>
        {applications.length > 0 ? (
          <div className="grid gap-3">
            {applications.map((application) => (
              <article
                key={application.id}
                className="rounded-md border border-[var(--border)] bg-white px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="grid gap-1">
                    <p className="text-sm font-semibold text-[var(--muted-foreground)]">
                      {application.purpose}
                    </p>
                    <p className="text-2xl font-semibold">
                      PHP {formatCurrency(application.requestedAmount)}
                    </p>
                  </div>
                  <span className="rounded-md bg-[var(--muted)] px-3 py-1 text-sm font-semibold capitalize">
                    {application.status}
                  </span>
                </div>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  <SummaryItem
                    label="Preferred term"
                    value={preferredTermLabels[application.preferredTerm]}
                  />
                  <SummaryItem
                    label="Submitted"
                    value={formatDate(application.submittedAt)}
                  />
                  <SummaryItem
                    label="Remarks"
                    value={application.remarks || "None"}
                  />
                </dl>
                <div className="mt-5 border-t border-[var(--border)] pt-4">
                  <h4 className="text-sm font-semibold">Offers for review</h4>
                  {application.offers.length > 0 ? (
                    <div className="mt-3 grid gap-3">
                      {application.offers.map((offer) => (
                        <div
                          key={offer.id}
                          className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[var(--muted-foreground)]">
                                Approved amount
                              </p>
                              <p className="mt-1 text-xl font-semibold">
                                PHP {formatCurrency(offer.approvedAmount)}
                              </p>
                              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                                {offer.lenderName}
                              </p>
                            </div>
                            <span
                              className={`rounded-md px-3 py-1 text-sm font-semibold capitalize ${getOfferStatusClassName(offer.status)}`}
                            >
                              {offer.status}
                            </span>
                          </div>
                          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
                            <SummaryItem
                              label="Lender"
                              value={offer.lenderName}
                            />
                            <SummaryItem
                              label="Amount"
                              value={`PHP ${formatCurrency(offer.approvedAmount)}`}
                            />
                            <SummaryItem
                              label="Repayment"
                              value={`PHP ${formatCurrency(offer.repaymentAmount)}`}
                            />
                            <SummaryItem
                              label="Fees"
                              value={`PHP ${formatCurrency(offer.fees)}`}
                            />
                            <SummaryItem
                              label="Due date"
                              value={formatDateOnly(offer.dueDate)}
                            />
                            <SummaryItem
                              label="Term"
                              value={`Due ${formatDateOnly(offer.dueDate)}`}
                            />
                          </dl>
                          {offer.remarks ? (
                            <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
                              {offer.remarks}
                            </p>
                          ) : null}
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
                            <p className="text-sm text-[var(--muted-foreground)]">
                              Sent {formatDate(offer.sentAt)}
                            </p>
                            <button
                              type="button"
                              disabled={isPending || offer.status !== "pending"}
                              onClick={() => onAcceptOffer(application.id, offer.id)}
                              className="inline-flex h-11 items-center justify-center rounded-md bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] transition hover:bg-[#0b5f59] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {offer.status === "accepted"
                                ? "Accepted"
                                : offer.status === "declined"
                                  ? "Closed"
                                  : isPending
                                    ? "Working..."
                                    : "Accept offer"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                      No offers for this application yet.
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-[var(--border)] px-4 py-4 text-sm leading-6 text-[var(--muted-foreground)]">
            No loan applications submitted yet.
          </div>
        )}
      </div>
    </section>
  );
}

function hasLocalPortfolioDraft() {
  return Boolean(window.localStorage.getItem(borrowerPortfolioDraftKey));
}

function getLocalApplications(): BorrowerLoanApplicationSummary[] {
  const storedApplications = window.localStorage.getItem(
    borrowerLoanApplicationsDraftKey,
  );

  if (!storedApplications) {
    return [];
  }

  try {
    const parsed = JSON.parse(storedApplications);

    if (Array.isArray(parsed)) {
      return parsed.map((application) => ({
        ...application,
        offers: Array.isArray(application.offers) ? application.offers : [],
      }));
    }
  } catch {
    window.localStorage.removeItem(borrowerLoanApplicationsDraftKey);
  }

  return [];
}

function toLocalApplication(
  values: LoanApplicationInput,
): BorrowerLoanApplicationSummary {
  return {
    id: window.crypto.randomUUID(),
    requestedAmount: values.requestedAmount,
    purpose: values.purpose.trim(),
    preferredTerm: values.preferredTerm,
    remarks: values.remarks?.trim() || null,
    status: "submitted",
    submittedAt: new Date().toISOString(),
    offers: [],
  };
}

function getOfferStatusClassName(status: string) {
  if (status === "accepted") {
    return "bg-[#e1f5ee] text-[#0f5f45]";
  }

  if (status === "declined") {
    return "bg-[#f5e8df] text-[#8a3d13]";
  }

  return "bg-[var(--muted)] text-[var(--foreground)]";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDateOnly(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`));
}

type SummaryItemProps = {
  label: string;
  value: string;
};

function SummaryItem({ label, value }: SummaryItemProps) {
  return (
    <div>
      <dt className="font-semibold text-[var(--muted-foreground)]">{label}</dt>
      <dd className="mt-1 break-words text-[var(--foreground)]">{value}</dd>
    </div>
  );
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
