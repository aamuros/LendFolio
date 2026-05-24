"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  acceptLoanOffer,
  type BorrowerLoanApplicationSummary,
  loadBorrowerLoanApplications,
  submitLoanApplication,
} from "@/app/borrower/actions";
import { CurrencyInput } from "@/components/currency-input";
import {
  borrowerPortfolioSavedEvent,
} from "@/lib/borrower-workflow-events";
import {
  loanApplicationSchema,
  preferredTermLabels,
  preferredTermOptions,
  type LoanApplicationInput,
} from "@/lib/loan-application";
import { parseMoneyInput } from "@/lib/money-input";

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
  const [message, setMessage] = useState("Loading applications...");
  const [applications, setApplications] = useState<
    BorrowerLoanApplicationSummary[]
  >([]);
  const [expandedApplicationIds, setExpandedApplicationIds] = useState<
    Set<string>
  >(new Set());
  const [expandedOfferIds, setExpandedOfferIds] = useState<Set<string>>(
    new Set(),
  );

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

          const nextHasPortfolio = result.hasPortfolio;
          const nextApplications = result.ok ? result.applications : [];

          setHasPortfolio(nextHasPortfolio);
          setApplications(nextApplications);
          setExpandedApplicationIds(
            getDefaultExpandedApplicationIds(nextApplications),
          );
          setExpandedOfferIds(getDefaultExpandedOfferIds(nextApplications));
          setLoadState(nextHasPortfolio ? "ready" : "blocked");
          setMessage(
            nextHasPortfolio
              ? result.message
              : "Save your business profile before submitting an application.",
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
      setMessage("Save your business profile before submitting an application.");
      return;
    }

    setMessage("Submitting application...");

    startTransition(async () => {
      const result = await submitLoanApplication(values);

      if (result.ok) {
        setApplications((current) => [
          { ...result.application, offers: [] },
          ...current,
        ]);
        setExpandedApplicationIds(
          (current) => new Set([...current, result.application.id]),
        );
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
      setExpandedApplicationIds((current) => new Set([...current, applicationId]));
      setExpandedOfferIds((current) => new Set([...current, offerId]));
      setLoadState("ready");
      setMessage(result.message);
    });
  }

  function toggleApplication(applicationId: string) {
    setExpandedApplicationIds((current) => {
      const next = new Set(current);

      if (next.has(applicationId)) {
        next.delete(applicationId);
      } else {
        next.add(applicationId);
      }

      return next;
    });
  }

  function toggleOffer(offerId: string) {
    setExpandedOfferIds((current) => {
      const next = new Set(current);

      if (next.has(offerId)) {
        next.delete(offerId);
      } else {
        next.add(offerId);
      }

      return next;
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
              Request financing
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
              Submit a loan request using your saved business profile.
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
        {loadState === "loading" ? "Loading applications..." : message}
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid gap-5"
        aria-describedby="loan-application-state"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Requested amount" error={errors.requestedAmount?.message}>
            <CurrencyInput
              registration={register("requestedAmount", {
                setValueAs: parseMoneyInput,
              })}
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
            placeholder="Optional notes for the lender."
          />
        </Field>

        <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
          <p
            id="loan-application-state"
            className="text-sm leading-6 text-[var(--muted-foreground)]"
            aria-live="polite"
          >
            Review lender offers when they arrive.
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
        <h3 className="text-lg font-semibold">Applications</h3>
        {applications.length > 0 ? (
          <div className="grid gap-3">
            {applications.map((application) => {
              const isExpanded = expandedApplicationIds.has(application.id);
              const pendingOfferCount = application.offers.filter(
                (offer) => offer.status === "pending",
              ).length;
              const applicationDetailsId = `application-${application.id}-details`;

              return (
                <article
                  key={application.id}
                  className="overflow-hidden rounded-md border border-[var(--border)] bg-white"
                >
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={applicationDetailsId}
                    onClick={() => toggleApplication(application.id)}
                    className="grid w-full gap-3 px-4 py-4 text-left transition hover:bg-[var(--muted)]/60 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--primary)] sm:grid-cols-[1.4fr_1fr_auto] sm:items-center"
                  >
                    <span className="grid gap-1">
                      <span className="text-sm font-semibold text-[var(--muted-foreground)]">
                        {application.purpose}
                      </span>
                      <span className="text-xl font-semibold">
                        PHP {formatCurrency(application.requestedAmount)}
                      </span>
                    </span>
                    <span className="grid gap-1 text-sm text-[var(--muted-foreground)]">
                      <span>Submitted {formatDate(application.submittedAt)}</span>
                      <span>
                        {application.offers.length === 1
                          ? "1 offer"
                          : `${application.offers.length} offers`}
                        {pendingOfferCount > 0
                          ? `, ${pendingOfferCount} pending`
                          : ""}
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2 sm:justify-end">
                      {pendingOfferCount > 0 ? (
                        <span className="rounded-md bg-[#fff4cf] px-3 py-1 text-sm font-semibold text-[#6f4e00]">
                          Pending offers
                        </span>
                      ) : null}
                      <span className="rounded-md bg-[var(--muted)] px-3 py-1 text-sm font-semibold capitalize text-[var(--foreground)]">
                        {application.status}
                      </span>
                      <span className="text-sm font-semibold text-[var(--primary)]">
                        {isExpanded ? "Hide" : "Review"}
                      </span>
                    </span>
                  </button>

                  {isExpanded ? (
                    <div
                      id={applicationDetailsId}
                      className="border-t border-[var(--border)] px-4 py-4"
                    >
                      <dl className="grid gap-3 text-sm sm:grid-cols-3">
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
                        <h4 className="text-sm font-semibold">
                          Offers for review
                        </h4>
                        {application.offers.length > 0 ? (
                          <div className="mt-3 grid gap-3">
                            {application.offers.map((offer) => {
                              const isOfferExpanded = expandedOfferIds.has(
                                offer.id,
                              );
                              const offerDetailsId = `offer-${offer.id}-details`;

                              return (
                                <div
                                  key={offer.id}
                                  className={`overflow-hidden rounded-md border bg-[var(--background)] ${
                                    offer.status === "pending"
                                      ? "border-[#d7a900]"
                                      : "border-[var(--border)]"
                                  }`}
                                >
                                  <button
                                    type="button"
                                    aria-expanded={isOfferExpanded}
                                    aria-controls={offerDetailsId}
                                    onClick={() => toggleOffer(offer.id)}
                                    className="grid w-full gap-3 px-3 py-3 text-left transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--primary)] sm:grid-cols-[1.2fr_1fr_auto] sm:items-center"
                                  >
                                    <span className="grid gap-1">
                                      <span className="text-sm font-semibold text-[var(--muted-foreground)]">
                                        {offer.lenderName}
                                      </span>
                                      <span className="text-lg font-semibold">
                                        PHP {formatCurrency(offer.approvedAmount)}
                                      </span>
                                    </span>
                                    <span className="grid gap-1 text-sm text-[var(--muted-foreground)]">
                                      <span>
                                        Repay PHP{" "}
                                        {formatCurrency(offer.repaymentAmount)}
                                      </span>
                                      <span>Due {formatDateOnly(offer.dueDate)}</span>
                                    </span>
                                    <span className="flex flex-wrap items-center gap-2 sm:justify-end">
                                      <span
                                        className={`rounded-md px-3 py-1 text-sm font-semibold capitalize ${getOfferStatusClassName(offer.status)}`}
                                      >
                                        {offer.status}
                                      </span>
                                      <span className="text-sm font-semibold text-[var(--primary)]">
                                        {isOfferExpanded ? "Hide" : "Details"}
                                      </span>
                                    </span>
                                  </button>

                                  {isOfferExpanded ? (
                                    <div
                                      id={offerDetailsId}
                                      className="border-t border-[var(--border)] px-3 py-3"
                                    >
                                      <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                                        <SummaryItem
                                          label="Fees"
                                          value={`PHP ${formatCurrency(offer.fees)}`}
                                        />
                                        <SummaryItem
                                          label="Remarks"
                                          value={offer.remarks || "None"}
                                        />
                                        <SummaryItem
                                          label="Sent"
                                          value={formatDate(offer.sentAt)}
                                        />
                                        <SummaryItem
                                          label="Status"
                                          value={offer.status}
                                        />
                                      </dl>
                                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
                                        <p className="text-sm text-[var(--muted-foreground)]">
                                          Accepting an offer closes other pending offers for this application.
                                        </p>
                                        <button
                                          type="button"
                                          disabled={
                                            isPending ||
                                            offer.status !== "pending"
                                          }
                                          onClick={() =>
                                            onAcceptOffer(
                                              application.id,
                                              offer.id,
                                            )
                                          }
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
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                            No offers for this application yet.
                          </p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
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

function getDefaultExpandedApplicationIds(
  applications: BorrowerLoanApplicationSummary[],
) {
  const pendingApplicationIds = applications
    .filter((application) =>
      application.offers.some((offer) => offer.status === "pending"),
    )
    .map((application) => application.id);

  if (pendingApplicationIds.length > 0) {
    return new Set(pendingApplicationIds);
  }

  if (applications.length === 1) {
    return new Set([applications[0].id]);
  }

  return new Set<string>();
}

function getDefaultExpandedOfferIds(applications: BorrowerLoanApplicationSummary[]) {
  return new Set(
    applications.flatMap((application) =>
      application.offers
        .filter((offer) => offer.status === "pending")
        .map((offer) => offer.id),
    ),
  );
}

function getOfferStatusClassName(status: string) {
  if (status === "accepted") {
    return "bg-[#e1f5ee] text-[#0f5f45]";
  }

  if (status === "declined") {
    return "bg-[#f5e8df] text-[#8a3d13]";
  }

  if (status === "pending") {
    return "bg-[#fff4cf] text-[#6f4e00]";
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
