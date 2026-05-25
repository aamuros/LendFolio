"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { FormEventHandler, ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm, type FieldErrors, type UseFormRegister } from "react-hook-form";
import {
  acceptLoanOffer,
  type BorrowerLoanApplicationSummary,
  declineLoanOffer,
  loadBorrowerLoanApplications,
  submitRepaymentProof,
  submitLoanApplication,
  updateLoanApplication,
  withdrawLoanApplication,
} from "@/app/borrower/actions";
import { CurrencyInput } from "@/components/currency-input";
import type { BorrowerTab } from "@/components/borrower-bottom-tabs";
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
type ProofFeedback = {
  tone: "success" | "error";
  message: string;
};

type BorrowerLoanApplicationPanelProps = {
  view?: "home" | "apply" | "offers";
  onNavigate?: (tab: BorrowerTab) => void;
};

export function BorrowerLoanApplicationPanel({
  view = "apply",
  onNavigate,
}: BorrowerLoanApplicationPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [hasPortfolio, setHasPortfolio] = useState(false);
  const [message, setMessage] = useState("Loading applications...");
  const [successMessage, setSuccessMessage] = useState("");
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
  const [proofFeedback, setProofFeedback] = useState<
    Record<string, ProofFeedback>
  >({});

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
          setSuccessMessage("");
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

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setSuccessMessage(""), 3000);

    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  const applicationCountLabel = useMemo(() => {
    if (applications.length === 1) {
      return "1 application";
    }

    return `${applications.length} applications`;
  }, [applications.length]);

  function onSubmit(values: LoanApplicationInput) {
    if (!hasPortfolio) {
      setLoadState("blocked");
      setMessage("Save your business profile before applying.");
      return;
    }

    setMessage("Submitting application...");
    setSuccessMessage("");

    startTransition(async () => {
      const result = await submitLoanApplication(values);

      if (result.ok) {
        setApplications((current) => [
          { ...result.application, offers: [], activeLoan: null },
          ...current,
        ]);
        setExpandedApplicationIds(
          (current) => new Set([...current, result.application.id]),
        );
        setLoadState("ready");
        setMessage("");
        setSuccessMessage(result.message);
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
    setSuccessMessage("");

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
      setSuccessMessage(result.message);
    });
  }

  function onCancelEditing() {
    setEditingApplicationId(null);
    setMessage("");
    setSuccessMessage("Changes discarded.");
  }

  function onWithdrawApplication(applicationId: string) {
    if (!window.confirm("Withdraw this application?")) {
      return;
    }

    setMessage("Withdrawing application...");
    setSuccessMessage("");

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
      setSuccessMessage(result.message);
    });
  }

  function onAcceptOffer(applicationId: string, offerId: string) {
    setMessage("Accepting offer...");
    setSuccessMessage("");

    startTransition(async () => {
      const result = await acceptLoanOffer(offerId);

      if (!result.ok) {
        setLoadState("error");
        setMessage(result.message);
        return;
      }

      const refreshed = await loadBorrowerLoanApplications();
      if (refreshed.ok) {
        setApplications(refreshed.applications);
      } else {
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
      }
      setExpandedApplicationIds((current) => new Set([...current, applicationId]));
      setExpandedOfferIds((current) => new Set([...current, offerId]));
      setLoadState("ready");
      setMessage("");
      setSuccessMessage(result.message);
    });
  }

  function onDeclineOffer(applicationId: string, offerId: string) {
    setMessage("Declining offer...");
    setSuccessMessage("");

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
      setSuccessMessage(result.message);
    });
  }

  function onSubmitProof(repaymentScheduleId: string, formData: FormData) {
    setMessage("");
    setSuccessMessage("");
    setProofFeedback((current) => ({
      ...current,
      [repaymentScheduleId]: {
        tone: "success",
        message: "Uploading proof...",
      },
    }));

    startTransition(async () => {
      const result = await submitRepaymentProof(repaymentScheduleId, formData);

      if (!result.ok) {
        setProofFeedback((current) => ({
          ...current,
          [repaymentScheduleId]: {
            tone: "error",
            message: result.message,
          },
        }));
        return;
      }

      const refreshed = await loadBorrowerLoanApplications();

      if (refreshed.ok) {
        setApplications(refreshed.applications);
      }

      setProofFeedback((current) => ({
        ...current,
        [repaymentScheduleId]: {
          tone: "success",
          message: result.message,
        },
      }));
    });
  }

  function toggleApplication(applicationId: string) {
    setSuccessMessage("");
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
    setSuccessMessage("");
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

  const pendingOffers = applications.flatMap((application) =>
    application.offers
      .filter((offer) => offer.status === "pending")
      .map((offer) => ({ application, offer })),
  );
  const closedOffers = applications.flatMap((application) =>
    application.offers
      .filter((offer) => offer.status !== "pending")
      .map((offer) => ({ application, offer })),
  );

  return (
    <section className="grid gap-5">
      <InlineFeedback
        loadState={loadState}
        message={message}
        successMessage={successMessage}
      />

      {view === "home" ? (
        <HomeSummary
          applications={applications}
          hasPortfolio={hasPortfolio}
          loadState={loadState}
          onNavigate={onNavigate}
          onSubmitProof={onSubmitProof}
          proofFeedback={proofFeedback}
        />
      ) : null}

      {view === "apply" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <SectionHeader
              title="Apply"
              description="Request financing after your business profile is saved."
            />
            <p className="text-sm font-semibold text-[var(--muted-foreground)]">
              {applicationCountLabel}
            </p>
          </div>

          {!hasPortfolio ? (
            <BlockedCard
              message="Save your business profile before applying."
              onClick={() => onNavigate?.("profile")}
            />
          ) : (
            <ApplicationForm
              errors={errors}
              isPending={isPending}
              register={register}
              onSubmit={handleSubmit(onSubmit)}
            />
          )}

          <ApplicationList
            applications={applications}
            editingApplicationId={editingApplicationId}
            expandedApplicationIds={expandedApplicationIds}
            isPending={isPending}
            onCancelEditing={onCancelEditing}
            onEdit={(applicationId) => {
              setSuccessMessage("");
              setEditingApplicationId(applicationId);
            }}
            onSaveApplication={onSaveApplication}
            onToggleApplication={toggleApplication}
            onWithdrawApplication={onWithdrawApplication}
          />
        </>
      ) : null}

      {view === "offers" ? (
        <>
          <SectionHeader
            title="Offers"
            description="Compare lender offers and accept the one that fits."
          />
          <OfferList
            closedOffers={closedOffers}
            expandedOfferIds={expandedOfferIds}
            isPending={isPending}
            onAcceptOffer={onAcceptOffer}
            onDeclineOffer={onDeclineOffer}
            onNavigate={onNavigate}
            onSubmitProof={onSubmitProof}
            onToggleOffer={toggleOffer}
            pendingOffers={pendingOffers}
            proofFeedback={proofFeedback}
          />
        </>
      ) : null}
    </section>
  );
}

function HomeSummary({
  applications,
  hasPortfolio,
  loadState,
  onNavigate,
  onSubmitProof,
  proofFeedback,
}: {
  applications: BorrowerLoanApplicationSummary[];
  hasPortfolio: boolean;
  loadState: LoadState;
  onNavigate?: (tab: BorrowerTab) => void;
  onSubmitProof: (repaymentScheduleId: string, formData: FormData) => void;
  proofFeedback: Record<string, ProofFeedback>;
}) {
  const summary = getHomeSummary(hasPortfolio, applications);
  const latestApplication = applications[0];
  const activeLoans = applications.flatMap((application) =>
    application.activeLoan ? [application.activeLoan] : [],
  );
  const latestActiveLoan = activeLoans[0];
  const pendingOfferCount = applications.reduce(
    (count, application) =>
      count +
      application.offers.filter((offer) => offer.status === "pending").length,
    0,
  );

  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <h1 className="text-2xl leading-tight font-semibold sm:text-3xl">
          Home
        </h1>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          Track your financing request and next step.
        </p>
      </div>

      <section className="grid gap-4 rounded-2xl border border-[var(--border)] bg-white px-4 py-4 shadow-sm sm:px-5">
        <div className="grid gap-2">
          {summary.label ? (
            <p className="text-sm font-semibold text-[var(--accent)]">
              {summary.label}
            </p>
          ) : null}
          <h2 className="text-2xl leading-tight font-semibold">
            {loadState === "loading" ? "Loading your workspace..." : summary.title}
          </h2>
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            {loadState === "loading" ? "Checking your profile and applications." : summary.description}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate?.(summary.tab)}
          disabled={loadState === "loading"}
          className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[var(--primary)] px-5 text-base font-semibold text-[var(--primary-foreground)] transition hover:bg-[#0f0f0f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-70 sm:w-fit"
        >
          {summary.action}
        </button>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Profile" value={hasPortfolio ? "Ready" : "Needs info"} />
        <SummaryCard
          label="Application"
          value={latestApplication ? formatApplicationStatus(latestApplication.status) : "Draft"}
        />
        <SummaryCard
          label="Loan"
          value={latestActiveLoan ? formatLoanStatus(latestActiveLoan.status) : getOfferSummary(applications, pendingOfferCount)}
        />
      </div>

      {latestActiveLoan ? (
        <ActiveLoanCard
          loan={latestActiveLoan}
          onSubmitProof={onSubmitProof}
          proofFeedback={proofFeedback}
        />
      ) : null}
    </div>
  );
}

function ApplicationForm({
  errors,
  isPending,
  onSubmit,
  register,
}: {
  errors: FieldErrors<LoanApplicationFormInput>;
  isPending: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  register: UseFormRegister<LoanApplicationFormInput>;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-4 rounded-3xl border border-[var(--border)] bg-white px-4 py-4 shadow-sm sm:px-5"
      aria-describedby="loan-application-state"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Requested amount" error={errors.requestedAmount?.message}>
          <CurrencyInput
            className="h-11 rounded-xl"
            registration={register("requestedAmount", {
              setValueAs: parseMoneyInput,
            })}
          />
        </Field>

        <Field label="Preferred term" error={errors.preferredTerm?.message}>
          <select
            {...register("preferredTerm")}
            className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-base text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
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
          className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-base outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          placeholder="Inventory, equipment, working capital"
        />
      </Field>

      <Field label="Remarks" error={errors.remarks?.message}>
        <textarea
          {...register("remarks")}
          rows={3}
          className="w-full resize-y rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-base leading-6 outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          placeholder="Optional notes for the lender."
        />
      </Field>

      <div className="grid gap-3 border-t border-[var(--border)] pt-4 sm:flex sm:items-center sm:justify-between">
        <p
          id="loan-application-state"
          className="text-sm leading-6 text-[var(--muted-foreground)]"
        >
          Lenders will review your request and send offers here.
        </p>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--primary)] px-5 text-base font-semibold text-[var(--primary-foreground)] transition hover:bg-[#0f0f0f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Submitting..." : "Submit application"}
        </button>
      </div>
    </form>
  );
}

function ApplicationList({
  applications,
  editingApplicationId,
  expandedApplicationIds,
  isPending,
  onCancelEditing,
  onEdit,
  onSaveApplication,
  onToggleApplication,
  onWithdrawApplication,
}: {
  applications: BorrowerLoanApplicationSummary[];
  editingApplicationId: string | null;
  expandedApplicationIds: Set<string>;
  isPending: boolean;
  onCancelEditing: () => void;
  onEdit: (applicationId: string) => void;
  onSaveApplication: (
    applicationId: string,
    values: LoanApplicationInput,
  ) => void;
  onToggleApplication: (applicationId: string) => void;
  onWithdrawApplication: (applicationId: string) => void;
}) {
  if (applications.length === 0) {
    return <EmptyState message="Your applications will appear here." />;
  }

  return (
    <div className="grid gap-3">
      <h3 className="text-lg font-semibold">Applications</h3>
      <div className="grid gap-3">
        {applications.map((application) => {
          const isExpanded = expandedApplicationIds.has(application.id);
          const isEditing = editingApplicationId === application.id;
          const isEditable = canEditApplication(application.status);
          const applicationDetailsId = `application-${application.id}-details`;

          return (
            <article
              key={application.id}
              className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-sm"
            >
              <button
                type="button"
                aria-expanded={isExpanded}
                aria-controls={applicationDetailsId}
                onClick={() => onToggleApplication(application.id)}
                className="grid w-full gap-3 px-4 py-4 text-left transition hover:bg-[var(--muted)]/50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--primary)] sm:grid-cols-[1.3fr_1fr_auto] sm:items-center"
              >
                <span className="grid gap-1">
                  <span className="text-sm font-semibold text-[var(--muted-foreground)]">
                    {application.purpose}
                  </span>
                  <span className="text-2xl font-semibold">
                    PHP {formatCurrency(application.requestedAmount)}
                  </span>
                </span>
                <span className="grid gap-1 text-sm text-[var(--muted-foreground)]">
                  <span>{preferredTermLabels[application.preferredTerm]}</span>
                  <span>Submitted {formatDate(application.submittedAt)}</span>
                </span>
                <span className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <StatusBadge value={application.status} />
                  <span className="text-sm font-semibold text-[var(--primary)]">
                    {isExpanded ? "Hide" : "View details"}
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
                      onSave={(values) => onSaveApplication(application.id, values)}
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

                      <div className="mt-4 grid gap-2 border-t border-[var(--border)] pt-4 sm:flex sm:items-center">
                        <button
                          type="button"
                          disabled={!isEditable || isPending}
                          onClick={() => onEdit(application.id)}
                          className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--border)] px-4 text-sm font-semibold transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Edit application
                        </button>
                        <button
                          type="button"
                          disabled={!isEditable || isPending}
                          onClick={() => onWithdrawApplication(application.id)}
                          className="inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--muted)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
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
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function OfferList({
  closedOffers,
  expandedOfferIds,
  isPending,
  onAcceptOffer,
  onDeclineOffer,
  onNavigate,
  onSubmitProof,
  onToggleOffer,
  pendingOffers,
  proofFeedback,
}: {
  closedOffers: OfferListItem[];
  expandedOfferIds: Set<string>;
  isPending: boolean;
  onAcceptOffer: (applicationId: string, offerId: string) => void;
  onDeclineOffer: (applicationId: string, offerId: string) => void;
  onNavigate?: (tab: BorrowerTab) => void;
  onSubmitProof: (repaymentScheduleId: string, formData: FormData) => void;
  onToggleOffer: (offerId: string) => void;
  pendingOffers: OfferListItem[];
  proofFeedback: Record<string, ProofFeedback>;
}) {
  if (pendingOffers.length === 0 && closedOffers.length === 0) {
    return (
      <BlockedCard
        message="Offers from lenders will appear after you submit an application."
        onClick={() => onNavigate?.("apply")}
        action="Go to Apply"
      />
    );
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-3">
        <h3 className="text-lg font-semibold">Pending</h3>
        {pendingOffers.length > 0 ? (
          <div className="grid gap-3">
            {pendingOffers.map((item) => (
              <OfferCard
                key={item.offer.id}
                item={item}
                isExpanded={expandedOfferIds.has(item.offer.id)}
                isPending={isPending}
                onAcceptOffer={onAcceptOffer}
                onDeclineOffer={onDeclineOffer}
                onSubmitProof={onSubmitProof}
                onToggleOffer={onToggleOffer}
                proofFeedback={proofFeedback}
              />
            ))}
          </div>
        ) : (
          <EmptyState message="No pending offers right now." />
        )}
      </div>

      {closedOffers.length > 0 ? (
        <div className="grid gap-3">
          <h3 className="text-lg font-semibold">Closed</h3>
          <div className="grid gap-3">
            {closedOffers.map((item) => (
              <OfferCard
                key={item.offer.id}
                item={item}
                isExpanded={expandedOfferIds.has(item.offer.id)}
                isPending={isPending}
                onAcceptOffer={onAcceptOffer}
                onDeclineOffer={onDeclineOffer}
                onSubmitProof={onSubmitProof}
                onToggleOffer={onToggleOffer}
                proofFeedback={proofFeedback}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

type OfferListItem = {
  application: BorrowerLoanApplicationSummary;
  offer: BorrowerLoanApplicationSummary["offers"][number];
};

function OfferCard({
  isExpanded,
  isPending,
  item,
  onAcceptOffer,
  onDeclineOffer,
  onSubmitProof,
  onToggleOffer,
  proofFeedback,
}: {
  isExpanded: boolean;
  isPending: boolean;
  item: OfferListItem;
  onAcceptOffer: (applicationId: string, offerId: string) => void;
  onDeclineOffer: (applicationId: string, offerId: string) => void;
  onSubmitProof: (repaymentScheduleId: string, formData: FormData) => void;
  onToggleOffer: (offerId: string) => void;
  proofFeedback: Record<string, ProofFeedback>;
}) {
  const { application, offer } = item;
  const offerDetailsId = `offer-${offer.id}-details`;
  const isClosed = offer.status !== "pending";

  return (
    <article
      className={`overflow-hidden rounded-3xl border bg-white shadow-sm ${
        offer.status === "pending"
          ? "border-[#d7c37f]"
          : "border-[var(--border)] opacity-75"
      }`}
    >
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={offerDetailsId}
        onClick={() => onToggleOffer(offer.id)}
        className="grid w-full gap-3 px-4 py-4 text-left transition hover:bg-[var(--muted)]/50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--primary)] sm:grid-cols-[1.2fr_1fr_auto] sm:items-center"
      >
        <span className="grid gap-1">
          <span className="text-sm font-semibold text-[var(--muted-foreground)]">
            {offer.lenderName}
          </span>
          <span className="text-2xl font-semibold">
            PHP {formatCurrency(offer.approvedAmount)}
          </span>
        </span>
        <span className="grid gap-1 text-sm text-[var(--muted-foreground)]">
          <span>Repay PHP {formatCurrency(offer.repaymentAmount)}</span>
          <span>Due {formatDateOnly(offer.dueDate)}</span>
        </span>
        <span className="flex flex-wrap items-center gap-2 sm:justify-end">
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold capitalize ${getOfferStatusClassName(offer.status)}`}
          >
            {offer.status}
          </span>
          <span className="text-sm font-semibold text-[var(--primary)]">
            {isExpanded ? "Hide" : "View details"}
          </span>
        </span>
      </button>

      {isExpanded ? (
        <div id={offerDetailsId} className="border-t border-[var(--border)] px-4 py-4">
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <SummaryItem label="Application" value={application.purpose} />
            <SummaryItem label="Fees" value={`PHP ${formatCurrency(offer.fees)}`} />
            <SummaryItem label="Sent" value={formatDate(offer.sentAt)} />
            <SummaryItem label="Remarks" value={offer.remarks || "None"} />
          </dl>

          {offer.status === "accepted" && application.activeLoan ? (
            <div className="mt-4 border-t border-[var(--border)] pt-4">
              <ActiveLoanCard
                loan={application.activeLoan}
                compact
                onSubmitProof={onSubmitProof}
                proofFeedback={proofFeedback}
              />
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 border-t border-[var(--border)] pt-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">
              {offer.status === "accepted" && application.activeLoan
                ? "This offer is linked to your active loan."
                : "Accepting an offer closes other pending offers for this application."}
            </p>
            <div className="grid gap-2 sm:flex">
              <button
                type="button"
                disabled={isPending || isClosed}
                onClick={() => onDeclineOffer(application.id, offer.id)}
                className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--border)] px-4 text-sm font-semibold transition hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Decline
              </button>
              <button
                type="button"
                disabled={isPending || isClosed}
                onClick={() => onAcceptOffer(application.id, offer.id)}
                className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] transition hover:bg-[#0f0f0f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
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
    </article>
  );
}

function InlineFeedback({
  loadState,
  message,
  successMessage,
}: {
  loadState: LoadState;
  message: string;
  successMessage: string;
}) {
  if (loadState === "loading" || loadState === "error" || loadState === "blocked") {
    return (
      <div
        className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 text-[var(--muted-foreground)]"
        role={loadState === "error" || loadState === "blocked" ? "alert" : "status"}
      >
        {loadState === "loading" ? "Loading applications..." : message}
      </div>
    );
  }

  if (successMessage) {
    return (
      <div
        className="rounded-2xl border border-[#cdd8d2] bg-white px-4 py-3 text-sm font-medium text-[var(--accent)]"
        role="status"
      >
        {successMessage}
      </div>
    );
  }

  return null;
}

function BlockedCard({
  action = "Go to Profile",
  message,
  onClick,
}: {
  action?: string;
  message: string;
  onClick?: () => void;
}) {
  return (
    <div className="grid gap-3 rounded-3xl border border-dashed border-[var(--border)] bg-white px-4 py-5 text-sm leading-6 text-[var(--muted-foreground)]">
      <p>{message}</p>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] transition hover:bg-[#0f0f0f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)] sm:w-fit"
        >
          {action}
        </button>
      ) : null}
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="grid gap-1">
      <h2 className="text-2xl leading-tight font-semibold">{title}</h2>
      <p className="text-sm leading-6 text-[var(--muted-foreground)]">
        {description}
      </p>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold capitalize">{value}</p>
    </div>
  );
}

function ActiveLoanCard({
  compact = false,
  loan,
  onSubmitProof,
  proofFeedback,
}: {
  compact?: boolean;
  loan: NonNullable<BorrowerLoanApplicationSummary["activeLoan"]>;
  onSubmitProof: (repaymentScheduleId: string, formData: FormData) => void;
  proofFeedback: Record<string, ProofFeedback>;
}) {
  const repayment = loan.schedule[0];
  const latestProof = repayment?.latestProof ?? null;
  const canUploadProof =
    repayment?.status === "due" || repayment?.status === "rejected";
  const currentFeedback = repayment ? proofFeedback[repayment.id] : null;

  return (
    <article className="grid gap-4 rounded-3xl border border-[#cdd8d2] bg-white px-4 py-4 shadow-sm sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <p className="text-sm font-semibold text-[var(--accent)]">
            Active loan
          </p>
          <h3 className={compact ? "text-lg font-semibold" : "text-2xl font-semibold"}>
            PHP {formatCurrency(loan.principalAmount)}
          </h3>
        </div>
        <span className="rounded-full bg-[#e1f5ee] px-3 py-1 text-xs font-semibold capitalize text-[#0f5f45]">
          {loan.status}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <SummaryItem
          label="Principal"
          value={`PHP ${formatCurrency(loan.principalAmount)}`}
        />
        <SummaryItem
          label="Repayment"
          value={`PHP ${formatCurrency(loan.repaymentAmount)}`}
        />
        <SummaryItem
          label="Outstanding"
          value={`PHP ${formatCurrency(loan.outstandingBalance)}`}
        />
        <SummaryItem label="Due date" value={formatDateOnly(loan.dueDate)} />
        <SummaryItem
          label="Repayment status"
          value={repayment?.status === "due" ? "Payment due" : repayment?.status ?? "Payment due"}
        />
        <SummaryItem
          label="Proof status"
          value={latestProof ? formatProofStatus(latestProof.status) : "Not uploaded"}
        />
      </dl>

      {repayment ? (
        <section className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/30 px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold">Repayment details</h4>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold capitalize text-[var(--foreground)]">
              {repayment.status === "due" ? "Payment due" : repayment.status}
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <SummaryItem
              label="Installment"
              value={`#${repayment.installmentNumber}`}
            />
            <SummaryItem
              label="Amount due"
              value={`PHP ${formatCurrency(repayment.amountDue)}`}
            />
            <SummaryItem
              label="Due date"
              value={formatDateOnly(repayment.dueDate)}
            />
            <SummaryItem
              label="Status"
              value={repayment.status === "due" ? "Payment due" : repayment.status}
            />
            <SummaryItem
              label="Proof"
              value={latestProof ? latestProof.fileName : "Not uploaded"}
            />
          </dl>
          {latestProof?.status === "submitted" ? (
            <ProofStatusMessage message="Proof submitted - waiting for lender review." />
          ) : null}
          {latestProof?.status === "verified" ? (
            <ProofStatusMessage message="Payment verified." />
          ) : null}
          {latestProof?.status === "rejected" ? (
            <ProofStatusMessage
              message={
                latestProof.reviewNotes
                  ? `Proof rejected: ${latestProof.reviewNotes}`
                  : "Proof rejected. Upload a new proof for lender review."
              }
              tone="error"
            />
          ) : null}
          {canUploadProof ? (
            <form
              action={(formData) => onSubmitProof(repayment.id, formData)}
              className="grid gap-3 border-t border-[var(--border)] pt-3"
            >
              <div className="grid gap-1">
                <label
                  htmlFor={`proof-${repayment.id}`}
                  className="text-sm font-semibold"
                >
                  Upload payment proof
                </label>
                <input
                  id={`proof-${repayment.id}`}
                  name="proofFile"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-[var(--muted)] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-[var(--foreground)]"
                />
                <p className="text-xs leading-5 text-[var(--muted-foreground)]">
                  JPG, PNG, WebP, or PDF up to 5 MB. This does not process a real payment.
                </p>
              </div>
              <button
                type="submit"
                className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] transition hover:bg-[#0f0f0f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)] sm:w-fit"
              >
                Submit proof
              </button>
              {currentFeedback ? (
                <ProofStatusMessage
                  message={currentFeedback.message}
                  tone={currentFeedback.tone}
                />
              ) : null}
            </form>
          ) : null}
        </section>
      ) : (
        <p className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/30 px-4 py-3 text-sm leading-6 text-[var(--muted-foreground)]">
          Your repayment schedule will appear here when it is ready.
        </p>
      )}
    </article>
  );
}

function ProofStatusMessage({
  message,
  tone = "success",
}: {
  message: string;
  tone?: "success" | "error";
}) {
  const className =
    tone === "error"
      ? "border-[#f3c7c7] bg-[#fff4f4] text-[#8f1d1d]"
      : "border-[#c8e6d8] bg-[#f1fbf6] text-[#0f5f45]";

  return (
    <p
      className={`rounded-2xl border px-3 py-2 text-sm leading-6 ${className}`}
      role="status"
    >
      {message}
    </p>
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
    <form onSubmit={handleSubmit(onSave)} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Requested amount" error={errors.requestedAmount?.message}>
          <CurrencyInput
            className="h-11 rounded-xl"
            registration={register("requestedAmount", {
              setValueAs: parseMoneyInput,
            })}
          />
        </Field>

        <Field label="Preferred term" error={errors.preferredTerm?.message}>
          <select
            {...register("preferredTerm")}
            className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-base text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
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
          className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-base outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
        />
      </Field>

      <Field label="Remarks" error={errors.remarks?.message}>
        <textarea
          {...register("remarks")}
          rows={3}
          className="w-full resize-y rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-base leading-6 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
        />
      </Field>

      <div className="grid gap-2 sm:flex sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--border)] px-4 text-sm font-semibold transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel editing
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] transition hover:bg-[#0f0f0f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function getHomeSummary(
  hasPortfolio: boolean,
  applications: BorrowerLoanApplicationSummary[],
) {
  const hasApplication = applications.length > 0;
  const hasPendingOffer = applications.some((application) =>
    application.offers.some((offer) => offer.status === "pending"),
  );
  const hasAcceptedOffer = applications.some((application) =>
    application.offers.some((offer) => offer.status === "accepted"),
  );
  const hasActiveLoan = applications.some((application) => application.activeLoan);

  if (!hasPortfolio) {
    return {
      action: "Complete profile",
      description: "Complete your business profile to apply.",
      label: "",
      tab: "profile",
      title: "Complete your profile",
    } satisfies HomeSummaryContent;
  }

  if (hasPendingOffer) {
    return {
      action: "Review offers",
      description: "You have pending offers to review.",
      label: "",
      tab: "offers",
      title: "Offer available",
    } satisfies HomeSummaryContent;
  }

  if (hasActiveLoan) {
    return {
      action: "View loan",
      description: "Your accepted offer is now an active loan.",
      label: "Status",
      tab: "offers",
      title: "Active loan",
    } satisfies HomeSummaryContent;
  }

  if (hasAcceptedOffer) {
    return {
      action: "View offer",
      description: "Your application has been accepted.",
      label: "Status",
      tab: "offers",
      title: "Offer accepted",
    } satisfies HomeSummaryContent;
  }

  if (hasApplication) {
    return {
      action: "View application",
      description: "Your application is submitted. Offers will appear when lenders respond.",
      label: "",
      tab: "apply",
      title: "Application submitted",
    } satisfies HomeSummaryContent;
  }

  return {
    action: "Start application",
    description: "Your profile is ready. Submit a loan application.",
    label: "",
    tab: "apply",
    title: "Ready to apply",
  } satisfies HomeSummaryContent;
}

function formatLoanStatus(status: string) {
  if (status === "active") {
    return "Active";
  }

  return status;
}

function formatProofStatus(status: string) {
  if (status === "submitted") {
    return "Submitted";
  }

  if (status === "verified") {
    return "Verified";
  }

  if (status === "rejected") {
    return "Rejected";
  }

  return status;
}

type HomeSummaryContent = {
  action: string;
  description: string;
  label: string;
  tab: BorrowerTab;
  title: string;
};

function formatApplicationStatus(status: string) {
  if (status === "submitted" || status === "open") {
    return "Submitted";
  }

  if (status === "accepted") {
    return "Accepted";
  }

  if (status === "withdrawn") {
    return "Withdrawn";
  }

  return status;
}

function getOfferSummary(
  applications: BorrowerLoanApplicationSummary[],
  pendingOfferCount: number,
) {
  const hasAcceptedOffer = applications.some((application) =>
    application.offers.some((offer) => offer.status === "accepted"),
  );

  if (hasAcceptedOffer) {
    return "Accepted";
  }

  if (pendingOfferCount > 0) {
    return "Pending";
  }

  return "None";
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
