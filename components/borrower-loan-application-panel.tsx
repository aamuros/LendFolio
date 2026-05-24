"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  acceptLoanOffer,
  type BorrowerLoanApplicationSummary,
  declineLoanOffer,
  loadBorrowerLoanApplications,
  submitLoanApplication,
  updateLoanApplication,
  withdrawLoanApplication,
} from "@/app/borrower/actions";
import { CurrencyInput } from "@/components/currency-input";
import { StatusToast } from "@/components/status-toast";
import { borrowerPortfolioSavedEvent } from "@/lib/borrower-workflow-events";
import {
  loanApplicationSchema,
  preferredTermLabels,
  preferredTermOptions,
  type LoanApplicationFormInput,
  type LoanApplicationInput,
} from "@/lib/loan-application";
import { parseMoneyInput } from "@/lib/money-input";
import { canEditApplication } from "@/lib/workflow-rules";

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
  const [toastMessage, setToastMessage] = useState("");
  const [applications, setApplications] = useState<
    BorrowerLoanApplicationSummary[]
  >([]);
  const [expandedApplicationIds, setExpandedApplicationIds] = useState<
    Set<string>
  >(new Set());
  const [expandedOfferIds, setExpandedOfferIds] = useState<Set<string>>(
    new Set(),
  );
  const [editingApplicationId, setEditingApplicationId] = useState<
    string | null
  >(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LoanApplicationFormInput, unknown, LoanApplicationInput>({
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
          setMessage(result.ok ? "" : result.message);
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

  const workflowSteps = useMemo(
    () => getWorkflowSteps(hasPortfolio, applications),
    [applications, hasPortfolio],
  );

  const applicationCountLabel = useMemo(() => {
    if (applications.length === 1) {
      return "1 application";
    }

    return `${applications.length} applications`;
  }, [applications.length]);

  const dismissToast = useCallback(() => {
    setToastMessage("");
  }, []);

  function onSubmit(values: LoanApplicationInput) {
    if (!hasPortfolio) {
      setLoadState("blocked");
      setMessage("Save your business profile before applying.");
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
        setMessage("");
        setToastMessage(result.message);
        reset(defaultValues);
        return;
      }

      setLoadState(result.mode === "missing-portfolio" ? "blocked" : "error");
      setMessage(result.message);
    });
  }

  function onSaveApplication(
    applicationId: string,
    values: LoanApplicationInput,
  ) {
    setMessage("Saving changes...");

    startTransition(async () => {
      const result = await updateLoanApplication(applicationId, values);

      if (!result.ok) {
        setLoadState("error");
        setMessage(result.message);
        return;
      }

      setApplications((current) =>
        current.map((application) =>
          application.id === applicationId
            ? { ...application, ...result.application }
            : application,
        ),
      );
      setEditingApplicationId(null);
      setLoadState("ready");
      setMessage("");
      setToastMessage(result.message);
    });
  }

  function onCancelEditing() {
    setEditingApplicationId(null);
    setMessage("");
    setToastMessage("Changes discarded.");
  }

  function onWithdrawApplication(applicationId: string) {
    if (!window.confirm("Withdraw this application?")) {
      return;
    }

    setMessage("Withdrawing application...");

    startTransition(async () => {
      const result = await withdrawLoanApplication(applicationId);

      if (!result.ok) {
        setLoadState("error");
        setMessage(result.message);
        return;
      }

      setApplications((current) =>
        current.map((application) =>
          application.id === applicationId
            ? {
                ...application,
                ...result.application,
                offers: application.offers.map((offer) =>
                  offer.status === "pending"
                    ? { ...offer, status: "declined" }
                    : offer,
                ),
              }
            : application,
        ),
      );
      setEditingApplicationId(null);
      setLoadState("ready");
      setMessage("");
      setToastMessage(result.message);
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
            status: "accepted",
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
      setMessage("");
      setToastMessage(result.message);
    });
  }

  function onDeclineOffer(applicationId: string, offerId: string) {
    setMessage("Declining offer...");

    startTransition(async () => {
      const result = await declineLoanOffer(offerId);

      if (!result.ok) {
        setLoadState("error");
        setMessage(result.message);
        return;
      }

      setApplications((current) =>
        current.map((application) =>
          application.id === applicationId
            ? {
                ...application,
                offers: application.offers.map((offer) =>
                  offer.id === offerId ? { ...offer, status: "declined" } : offer,
                ),
              }
            : application,
        ),
      );
      setLoadState("ready");
      setMessage("");
      setToastMessage(result.message);
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
    <section className="grid gap-7 border-t border-[var(--border)] pt-7">
      <StatusToast message={toastMessage} onDismiss={dismissToast} />

      <WorkflowStepper steps={workflowSteps} />

      {loadState === "loading" || loadState === "error" || loadState === "blocked" ? (
        <div
          className="rounded-md border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 text-[var(--muted-foreground)]"
          role={loadState === "error" || loadState === "blocked" ? "alert" : "status"}
        >
          {loadState === "loading" ? "Loading applications..." : message}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="grid gap-2">
          <h2 className="text-2xl leading-tight font-semibold">
            Loan application
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
            Submit one request and review lender offers here.
          </p>
        </div>
        <p className="text-sm font-semibold text-[var(--muted-foreground)]">
          {applicationCountLabel}
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid gap-5 rounded-md border border-[var(--border)] bg-white px-4 py-4"
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
            {hasPortfolio
              ? "Next: compare offers when lenders respond."
              : "Save your profile before applying."}
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
        <h3 className="text-lg font-semibold">Applications and offers</h3>
        {applications.length > 0 ? (
          <div className="grid gap-3">
            {applications.map((application) => {
              const isExpanded = expandedApplicationIds.has(application.id);
              const isEditing = editingApplicationId === application.id;
              const isEditable = canEditApplication(application.status);
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
                      <StatusBadge value={application.status} />
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
                      {isEditing ? (
                        <ApplicationEditForm
                          application={application}
                          isPending={isPending}
                          onCancel={onCancelEditing}
                          onSave={(values) =>
                            onSaveApplication(application.id, values)
                          }
                        />
                      ) : (
                        <>
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

                          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
                            <button
                              type="button"
                              disabled={!isEditable || isPending}
                              onClick={() => setEditingApplicationId(application.id)}
                              className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--border)] px-3 text-sm font-semibold transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Edit application
                            </button>
                            <button
                              type="button"
                              disabled={!isEditable || isPending}
                              onClick={() => onWithdrawApplication(application.id)}
                              className="inline-flex h-10 items-center justify-center rounded-md px-3 text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--muted)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Withdraw
                            </button>
                            {!isEditable ? (
                              <p className="text-sm text-[var(--muted-foreground)]">
                                Closed applications cannot be edited.
                              </p>
                            ) : null}
                          </div>
                        </>
                      )}

                      <div className="mt-5 border-t border-[var(--border)] pt-4">
                        <h4 className="text-sm font-semibold">Offers</h4>
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
                                          Accepting an offer closes other pending offers.
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                          <button
                                            type="button"
                                            disabled={
                                              isPending ||
                                              offer.status !== "pending"
                                            }
                                            onClick={() =>
                                              onDeclineOffer(
                                                application.id,
                                                offer.id,
                                              )
                                            }
                                            className="inline-flex h-11 items-center justify-center rounded-md border border-[var(--border)] px-4 text-sm font-semibold transition hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                                          >
                                            Decline
                                          </button>
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
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <EmptyState message="Offers from lenders will appear here." />
                        )}
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState message="Submit an application to start receiving offers." />
        )}
      </div>
    </section>
  );
}

function ApplicationEditForm({
  application,
  isPending,
  onCancel,
  onSave,
}: {
  application: BorrowerLoanApplicationSummary;
  isPending: boolean;
  onCancel: () => void;
  onSave: (values: LoanApplicationInput) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoanApplicationFormInput, unknown, LoanApplicationInput>({
    resolver: zodResolver(loanApplicationSchema),
    defaultValues: {
      requestedAmount: application.requestedAmount,
      purpose: application.purpose,
      preferredTerm: application.preferredTerm,
      remarks: application.remarks ?? "",
    },
    mode: "onBlur",
  });

  return (
    <form onSubmit={handleSubmit(onSave)} className="grid gap-5">
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
        />
      </Field>

      <Field label="Remarks" error={errors.remarks?.message}>
        <textarea
          {...register("remarks")}
          rows={4}
          className="w-full resize-y rounded-md border border-[var(--border)] bg-white px-3 py-3 text-base leading-7 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
        />
      </Field>

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="inline-flex h-11 items-center justify-center rounded-md border border-[var(--border)] px-4 text-sm font-semibold transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel editing
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-11 items-center justify-center rounded-md bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] transition hover:bg-[#0b5f59] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function WorkflowStepper({
  steps,
}: {
  steps: { label: string; state: "complete" | "current" | "needs-action" }[];
}) {
  return (
    <nav aria-label="Borrower workflow" className="rounded-md border border-[var(--border)] bg-white px-3 py-3">
      <ol className="grid gap-2 sm:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.label} className="flex items-center gap-3">
            <span
              className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${getStepClassName(step.state)}`}
              aria-hidden="true"
            >
              {step.state === "complete" ? "✓" : index + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{step.label}</span>
              <span className="block text-xs capitalize text-[var(--muted-foreground)]">
                {step.state === "needs-action" ? "Needs action" : step.state}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function getWorkflowSteps(
  hasProfile: boolean,
  applications: BorrowerLoanApplicationSummary[],
) {
  const hasApplication = applications.length > 0;
  const hasPendingOffer = applications.some((application) =>
    application.offers.some((offer) => offer.status === "pending"),
  );
  const hasAcceptedOffer = applications.some((application) =>
    application.offers.some((offer) => offer.status === "accepted"),
  );

  return [
    {
      label: "Business profile",
      state: hasProfile ? "complete" : "current",
    },
    {
      label: "Loan application",
      state: !hasProfile
        ? "needs-action"
        : hasApplication
          ? "complete"
          : "current",
    },
    {
      label: "Offers",
      state: hasAcceptedOffer
        ? "complete"
        : hasPendingOffer
          ? "current"
          : "needs-action",
    },
  ] satisfies { label: string; state: "complete" | "current" | "needs-action" }[];
}

function getStepClassName(state: "complete" | "current" | "needs-action") {
  if (state === "complete") {
    return "bg-[#e1f5ee] text-[#0f5f45]";
  }

  if (state === "current") {
    return "bg-[var(--primary)] text-[var(--primary-foreground)]";
  }

  return "bg-[var(--muted)] text-[var(--muted-foreground)]";
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

function StatusBadge({ value }: { value: string }) {
  return (
    <span className="rounded-md bg-[var(--muted)] px-3 py-1 text-sm font-semibold capitalize text-[var(--foreground)]">
      {value}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-dashed border-[var(--border)] px-4 py-4 text-sm leading-6 text-[var(--muted-foreground)]">
      {message}
    </div>
  );
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
      <span className="min-h-5 text-sm leading-5 text-[var(--accent)]">
        {error ?? ""}
      </span>
    </label>
  );
}
