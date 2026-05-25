"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { FormEventHandler, ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  useForm,
  useWatch,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";
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
import {
  CompactCreditStatusCard,
  CreditEligibilityBanner,
} from "@/components/borrower-credit-summary";
import type { BorrowerTab } from "@/components/borrower-bottom-tabs";
import { borrowerPortfolioSavedEvent } from "@/lib/borrower-workflow-events";
import {
  formatCreditAmount,
  type BorrowerCreditSummary,
} from "@/lib/credit-limit";
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

const collapsedApplicationsStorageKey =
  "lendfolio.borrower.collapsedApplications";
const collapsedOffersStorageKey = "lendfolio.borrower.collapsedOffers";
const collapsedRepaymentsStorageKey = "lendfolio.borrower.collapsedRepayments";

type LoadState = "loading" | "ready" | "blocked" | "error";
type ProofFeedback = {
  tone: "success" | "error";
  message: string;
};

type BorrowerLoanApplicationPanelProps = {
  view?: "home" | "apply" | "offers" | "loans";
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
  const [creditSummary, setCreditSummary] =
    useState<BorrowerCreditSummary | null>(null);
  const [expandedApplicationIds, setExpandedApplicationIds] = useState<
    Set<string>
  >(new Set());
  const [expandedOfferIds, setExpandedOfferIds] = useState<Set<string>>(
    new Set(),
  );
  const [expandedRepaymentIds, setExpandedRepaymentIds] = useState<Set<string>>(
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
    control,
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
          setCreditSummary(result.creditSummary);
          setExpandedApplicationIds(
            getDefaultExpandedApplicationIds(
              nextApplications,
              readStoredIdSet(collapsedApplicationsStorageKey),
            ),
          );
          setExpandedOfferIds(
            getDefaultExpandedOfferIds(
              nextApplications,
              readStoredIdSet(collapsedOffersStorageKey),
            ),
          );
          setExpandedRepaymentIds(
            getDefaultExpandedRepaymentIds(
              nextApplications,
              readStoredIdSet(collapsedRepaymentsStorageKey),
            ),
          );
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
  const watchedRequestedAmount = parseMoneyInput(
    useWatch({ control, name: "requestedAmount" }),
  );
  const requestedAmount =
    typeof watchedRequestedAmount === "number" ? watchedRequestedAmount : 0;

  function onSubmit(values: LoanApplicationInput) {
    if (!hasPortfolio) {
      setLoadState("blocked");
      setMessage("Save your business profile before applying.");
      return;
    }

    if (
      creditSummary &&
      values.requestedAmount > creditSummary.availableCredit
    ) {
      setLoadState("ready");
      setMessage("");
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
        setCreditSummary(refreshed.creditSummary);
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
      setStoredIdCollapsed(collapsedApplicationsStorageKey, applicationId, false);
      setStoredIdCollapsed(collapsedOffersStorageKey, offerId, false);
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
        setCreditSummary(refreshed.creditSummary);
        setExpandedRepaymentIds(
          getDefaultExpandedRepaymentIds(
            refreshed.applications,
            readStoredIdSet(collapsedRepaymentsStorageKey),
          ),
        );
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
        setStoredIdCollapsed(collapsedApplicationsStorageKey, applicationId, true);
      } else {
        next.add(applicationId);
        setStoredIdCollapsed(collapsedApplicationsStorageKey, applicationId, false);
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
        setStoredIdCollapsed(collapsedOffersStorageKey, offerId, true);
      } else {
        next.add(offerId);
        setStoredIdCollapsed(collapsedOffersStorageKey, offerId, false);
      }

      return next;
    });
  }

  function toggleRepayment(repaymentId: string) {
    setSuccessMessage("");
    setExpandedRepaymentIds((current) => {
      const next = new Set(current);

      if (next.has(repaymentId)) {
        next.delete(repaymentId);
        setStoredIdCollapsed(collapsedRepaymentsStorageKey, repaymentId, true);
      } else {
        next.add(repaymentId);
        setStoredIdCollapsed(collapsedRepaymentsStorageKey, repaymentId, false);
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
          creditSummary={creditSummary}
          hasPortfolio={hasPortfolio}
          loadState={loadState}
          onNavigate={onNavigate}
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
              creditSummary={creditSummary}
              errors={errors}
              isPending={isPending}
              requestedAmount={requestedAmount}
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
            onToggleOffer={toggleOffer}
            pendingOffers={pendingOffers}
          />
        </>
      ) : null}

      {view === "loans" ? (
        <>
          <SectionHeader
            title="Loans"
            description="Track active loans, repayment schedules, and payment proof."
          />
          <BorrowerLoansPanel
            applications={applications}
            expandedRepaymentIds={expandedRepaymentIds}
            isPending={isPending}
            onNavigate={onNavigate}
            onSubmitProof={onSubmitProof}
            onToggleRepayment={toggleRepayment}
            proofFeedback={proofFeedback}
          />
        </>
      ) : null}
    </section>
  );
}

function HomeSummary({
  applications,
  creditSummary,
  hasPortfolio,
  loadState,
  onNavigate,
}: {
  applications: BorrowerLoanApplicationSummary[];
  creditSummary: BorrowerCreditSummary | null;
  hasPortfolio: boolean;
  loadState: LoadState;
  onNavigate?: (tab: BorrowerTab) => void;
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

      {creditSummary ? (
        <CompactCreditStatusCard summary={creditSummary} />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryCard
          label="Application"
          value={
            latestApplication
              ? formatApplicationStatus(latestApplication.status)
              : "Draft"
          }
        />
        <SummaryCard
          label="Loan"
          value={
            latestActiveLoan
              ? formatLoanStatus(latestActiveLoan.status)
              : getOfferSummary(applications, pendingOfferCount)
          }
        />
      </div>
    </div>
  );
}

function ApplicationForm({
  creditSummary,
  errors,
  isPending,
  onSubmit,
  requestedAmount,
  register,
}: {
  creditSummary: BorrowerCreditSummary | null;
  errors: FieldErrors<LoanApplicationFormInput>;
  isPending: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  requestedAmount: number;
  register: UseFormRegister<LoanApplicationFormInput>;
}) {
  const isOverAvailableCredit =
    creditSummary !== null && requestedAmount > creditSummary.availableCredit;
  const requestedAmountError = isOverAvailableCredit
    ? "Requested amount exceeds your available credit."
    : errors.requestedAmount?.message;

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-4 rounded-3xl border border-[var(--border)] bg-white px-4 py-4 shadow-sm sm:px-5"
      aria-describedby="loan-application-state"
    >
      {creditSummary ? <CreditEligibilityBanner summary={creditSummary} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Requested amount" error={requestedAmountError}>
          <CurrencyInput
            className="h-11 rounded-xl"
            aria-invalid={isOverAvailableCredit || Boolean(errors.requestedAmount)}
            aria-describedby={
              isOverAvailableCredit ? "requested-amount-credit-limit" : undefined
            }
            registration={register("requestedAmount", {
              setValueAs: parseMoneyInput,
            })}
          />
          {creditSummary && isOverAvailableCredit ? (
            <span
              id="requested-amount-credit-limit"
              className="text-sm font-semibold text-[#8f1d1d]"
            >
              Maximum request: {formatCreditAmount(creditSummary.availableCredit)}
            </span>
          ) : null}
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
          disabled={isPending || isOverAvailableCredit}
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
            <BorrowerListCard
              key={application.id}
              detailsId={applicationDetailsId}
              isExpanded={isExpanded}
              label={application.purpose}
              amount={application.requestedAmount}
              metadata={[
                preferredTermLabels[application.preferredTerm],
                `Submitted ${formatDate(application.submittedAt)}`,
              ]}
              status={<StatusBadge value={application.status} />}
              onToggle={() => onToggleApplication(application.id)}
            >
              {isExpanded ? (
                <div
                  id={applicationDetailsId}
                  className="border-t border-[var(--border)] px-4 py-4 sm:px-5"
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
            </BorrowerListCard>
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
  onToggleOffer,
  pendingOffers,
}: {
  closedOffers: OfferListItem[];
  expandedOfferIds: Set<string>;
  isPending: boolean;
  onAcceptOffer: (applicationId: string, offerId: string) => void;
  onDeclineOffer: (applicationId: string, offerId: string) => void;
  onNavigate?: (tab: BorrowerTab) => void;
  onToggleOffer: (offerId: string) => void;
  pendingOffers: OfferListItem[];
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
                onNavigate={onNavigate}
                onToggleOffer={onToggleOffer}
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
                onNavigate={onNavigate}
                onToggleOffer={onToggleOffer}
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

function BorrowerListCard({
  amount,
  children,
  detailsId,
  isExpanded,
  label,
  metadata,
  onToggle,
  status,
}: {
  amount: number;
  children: ReactNode;
  detailsId: string;
  isExpanded: boolean;
  label: string;
  metadata: string[];
  onToggle: () => void;
  status: ReactNode;
}) {
  return (
    <article className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-sm">
      <BorrowerListCardHeader
        amount={amount}
        detailsId={detailsId}
        isExpanded={isExpanded}
        label={label}
        metadata={metadata}
        onToggle={onToggle}
        status={status}
      />
      {children}
    </article>
  );
}

function BorrowerListCardHeader({
  amount,
  detailsId,
  isExpanded,
  label,
  metadata,
  onToggle,
  status,
}: {
  amount: number;
  detailsId: string;
  isExpanded: boolean;
  label: string;
  metadata: string[];
  onToggle: () => void;
  status: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-expanded={isExpanded}
      aria-controls={detailsId}
      onClick={onToggle}
      className="grid w-full gap-3 px-4 py-4 text-left transition hover:bg-[var(--muted)]/50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--primary)] sm:grid-cols-[1.25fr_1fr_auto] sm:items-center sm:px-5"
    >
      <span className="grid gap-1">
        <span className="text-sm font-semibold text-[var(--muted-foreground)]">
          {label}
        </span>
        <MoneyText value={amount} className="text-2xl font-semibold" />
      </span>
      <span className="grid gap-1 text-sm text-[var(--muted-foreground)]">
        {metadata.slice(0, 2).map((item) => (
          <span key={item}>{item}</span>
        ))}
      </span>
      <span className="flex flex-wrap items-center gap-2 sm:justify-end">
        {status}
        <span className="text-sm font-semibold text-[var(--primary)]">
          {isExpanded ? "Hide" : "View details"}
        </span>
      </span>
    </button>
  );
}

function OfferCard({
  isExpanded,
  isPending,
  item,
  onAcceptOffer,
  onDeclineOffer,
  onNavigate,
  onToggleOffer,
}: {
  isExpanded: boolean;
  isPending: boolean;
  item: OfferListItem;
  onAcceptOffer: (applicationId: string, offerId: string) => void;
  onDeclineOffer: (applicationId: string, offerId: string) => void;
  onNavigate?: (tab: BorrowerTab) => void;
  onToggleOffer: (offerId: string) => void;
}) {
  const { application, offer } = item;
  const offerDetailsId = `offer-${offer.id}-details`;
  const isClosed = offer.status !== "pending";

  return (
    <article
      className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-sm"
    >
      <BorrowerListCardHeader
        detailsId={offerDetailsId}
        isExpanded={isExpanded}
        label={offer.lenderName}
        amount={offer.approvedAmount}
        metadata={[
          `Repay ${formatMoney(offer.repaymentAmount)}`,
          `Due ${formatDateOnly(offer.dueDate)}`,
        ]}
        status={<StatusBadge value={offer.status} />}
        onToggle={() => onToggleOffer(offer.id)}
      />

      {isExpanded ? (
        <div id={offerDetailsId} className="border-t border-[var(--border)] px-4 py-4 sm:px-5">
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <SummaryItem label="Application" value={application.purpose} />
            <SummaryItem label="Fees" value={formatMoney(offer.fees)} />
            <SummaryItem label="Sent" value={formatDate(offer.sentAt)} />
            <SummaryItem label="Remarks" value={offer.remarks || "None"} />
          </dl>

          {offer.status === "accepted" && application.activeLoan ? (
            <div className="mt-4 grid gap-3 border-t border-[var(--border)] pt-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                Linked to loan.
              </p>
              <button
                type="button"
                onClick={() => onNavigate?.("loans")}
                className="inline-flex h-11 w-full items-center justify-center rounded-full border border-[var(--border)] px-4 text-sm font-semibold transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)] sm:w-fit"
              >
                View loan
              </button>
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 border-t border-[var(--border)] pt-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">
              {offer.status === "accepted" && application.activeLoan
                ? "Use Loans to track repayments."
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

function BorrowerLoansPanel({
  applications,
  expandedRepaymentIds,
  isPending,
  onNavigate,
  onSubmitProof,
  onToggleRepayment,
  proofFeedback,
}: {
  applications: BorrowerLoanApplicationSummary[];
  expandedRepaymentIds: Set<string>;
  isPending: boolean;
  onNavigate?: (tab: BorrowerTab) => void;
  onSubmitProof: (repaymentScheduleId: string, formData: FormData) => void;
  onToggleRepayment: (repaymentScheduleId: string) => void;
  proofFeedback: Record<string, ProofFeedback>;
}) {
  const activeLoans = applications.flatMap((application) =>
    application.activeLoan ? [application.activeLoan] : [],
  );

  if (activeLoans.length === 0) {
    return (
      <BlockedCard
        message="When you accept an offer, the active loan and repayment schedule will appear here."
        action="Review offers"
        onClick={() => onNavigate?.("offers")}
      />
    );
  }

  return (
    <div className="grid gap-4">
      {activeLoans.map((loan) => (
        <ActiveLoanCard
          key={loan.id}
          expandedRepaymentIds={expandedRepaymentIds}
          isPending={isPending}
          loan={loan}
          onSubmitProof={onSubmitProof}
          onToggleRepayment={onToggleRepayment}
          proofFeedback={proofFeedback}
        />
      ))}
    </div>
  );
}

function ActiveLoanCard({
  expandedRepaymentIds,
  isPending,
  loan,
  onSubmitProof,
  onToggleRepayment,
  proofFeedback,
}: {
  expandedRepaymentIds: Set<string>;
  isPending: boolean;
  loan: NonNullable<BorrowerLoanApplicationSummary["activeLoan"]>;
  onSubmitProof: (repaymentScheduleId: string, formData: FormData) => void;
  onToggleRepayment: (repaymentScheduleId: string) => void;
  proofFeedback: Record<string, ProofFeedback>;
}) {
  const paidAmount = Math.max(loan.repaymentAmount - loan.outstandingBalance, 0);
  const progressPercent =
    loan.repaymentAmount > 0
      ? Math.min(Math.round((paidAmount / loan.repaymentAmount) * 100), 100)
      : 0;
  const nextRepayment = getNextRepayment(loan.schedule);
  const isCompletedLoan = loan.status === "paid" || loan.status === "closed";
  const primaryAmount = isCompletedLoan ? paidAmount : loan.outstandingBalance;
  const remainingAmount = isCompletedLoan ? 0 : loan.outstandingBalance;

  return (
    <article className="grid gap-4">
      <section className="grid gap-4 rounded-3xl border border-[var(--border)] bg-white px-4 py-5 shadow-sm sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <p className="text-sm font-semibold text-[var(--muted-foreground)]">
            {isCompletedLoan ? "Completed loan" : "Current loan"}
          </p>
          <MoneyText value={primaryAmount} className="text-3xl font-semibold" />
          <p className="text-sm text-[var(--muted-foreground)]">
            {isCompletedLoan ? "Total repaid" : "Outstanding balance"}
          </p>
        </div>
        <LoanStatusPill status={loan.status} />
      </div>

        <div className="grid grid-cols-3 gap-3 border-y border-[var(--border)] py-4 text-sm">
          <SummaryItem label="Principal" value={formatMoney(loan.principalAmount)} />
          <SummaryItem label="Total repayment" value={formatMoney(loan.repaymentAmount)} />
          <SummaryItem label="Final due" value={formatDateOnly(loan.dueDate)} />
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold text-[var(--muted-foreground)]">
              Progress
            </span>
            <span className="font-semibold">{progressPercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--muted)]">
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            {formatMoney(paidAmount)} paid · {formatMoney(remainingAmount)} remaining
          </p>
        </div>

        {nextRepayment ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] px-4 py-3">
            <div className="grid gap-1">
              <p className="text-sm font-semibold">Next repayment</p>
              <p className="text-sm text-[var(--muted-foreground)]">
                Due {formatDateOnly(nextRepayment.dueDate)}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <MoneyText value={nextRepayment.amountDue} className="text-lg font-semibold" />
              <div className="mt-1">
                <RepaymentStatusPill status={nextRepayment.status} />
              </div>
            </div>
          </div>
        ) : null}

        {isCompletedLoan ? (
          <p className="rounded-2xl border border-[#c8e6d8] bg-[#f1fbf6] px-4 py-3 text-sm font-semibold text-[#0f5f45]">
            All repayments verified.
          </p>
        ) : null}
      </section>

      <section className="grid gap-2 rounded-3xl border border-[var(--border)] bg-white px-4 py-5 shadow-sm sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-base font-semibold">Repayment schedule</h4>
          <p className="text-sm text-[var(--muted-foreground)]">
            {loan.schedule.length} {loan.schedule.length === 1 ? "installment" : "installments"}
          </p>
        </div>
        {loan.schedule.length > 0 ? (
          <div className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)]">
            {loan.schedule.map((repayment) => (
              <RepaymentScheduleItem
                key={repayment.id}
                isExpanded={expandedRepaymentIds.has(repayment.id)}
                isPending={isPending}
                repayment={repayment}
                onSubmitProof={onSubmitProof}
                onToggle={() => onToggleRepayment(repayment.id)}
                proofFeedback={proofFeedback[repayment.id] ?? null}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/30 px-4 py-3 text-sm leading-6 text-[var(--muted-foreground)]">
            Your repayment schedule will appear here when it is ready.
          </p>
        )}
      </section>
    </article>
  );
}

function RepaymentScheduleItem({
  isExpanded,
  isPending,
  onToggle,
  repayment,
  onSubmitProof,
  proofFeedback,
}: {
  isExpanded: boolean;
  isPending: boolean;
  onToggle: () => void;
  repayment: NonNullable<BorrowerLoanApplicationSummary["activeLoan"]>["schedule"][number];
  onSubmitProof: (repaymentScheduleId: string, formData: FormData) => void;
  proofFeedback: ProofFeedback | null;
}) {
  const latestProof = repayment.latestProof;
  const canUploadProof =
    repayment.status === "due" ||
    repayment.status === "late" ||
    repayment.status === "rejected" ||
    latestProof?.status === "rejected";
  const isRejected =
    repayment.status === "rejected" || latestProof?.status === "rejected";
  const isVerified =
    repayment.status === "verified" || latestProof?.status === "verified";
  const isSubmitted =
    repayment.status === "submitted" || latestProof?.status === "submitted";
  const repaymentDetailsId = `repayment-${repayment.id}-details`;
  const statusText = getRepaymentStatusText(repayment.status, latestProof?.status);

  return (
    <div className="grid gap-3 bg-white px-4 py-4">
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={repaymentDetailsId}
        onClick={onToggle}
        className="grid gap-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)] sm:grid-cols-[1fr_auto] sm:items-center"
      >
        <span className="grid gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">
              Installment {repayment.installmentNumber}
            </span>
            <RepaymentStatusPill status={repayment.status} />
            {latestProof ? <ProofStatusPill status={latestProof.status} /> : null}
          </span>
          <span className="text-sm text-[var(--muted-foreground)]">
            Due {formatDateOnly(repayment.dueDate)} · {statusText}
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-3 sm:justify-end">
          <MoneyText value={repayment.amountDue} className="text-xl font-semibold" />
          <span className="text-sm font-semibold text-[var(--primary)]">
            {isExpanded ? "Hide" : "Details"}
          </span>
        </span>
      </button>

      {isExpanded ? (
        <div id={repaymentDetailsId} className="grid gap-3 border-t border-[var(--border)] pt-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryItem label="Repayment" value={formatRepaymentStatus(repayment.status)} />
            <SummaryItem
              label="Latest proof"
              value={latestProof ? formatProofStatus(latestProof.status) : "Not submitted"}
            />
            <SummaryItem label="Amount due" value={formatMoney(repayment.amountDue)} />
          </div>

          {isVerified ? (
            <ActionBanner
              tone="success"
              title="Repayment verified"
              message="This repayment is paid."
            />
          ) : null}

          {isRejected ? (
            <ActionBanner
              tone="error"
              title="Proof rejected"
              message={getRejectedProofNextStep(latestProof?.reviewNotes)}
            />
          ) : null}
          {isSubmitted && !isRejected ? (
            <ActionBanner
              tone="info"
              title="Waiting for lender review"
              message="Your lender is checking the latest proof. You cannot upload another proof while this one is under review."
            />
          ) : null}

          {repayment.proofs.length > 0 ? (
            <ProofHistory proofs={repayment.proofs} />
          ) : null}

          {canUploadProof ? (
            <RepaymentProofForm
              isPending={isPending}
              isRejected={isRejected}
              repaymentId={repayment.id}
              proofFeedback={proofFeedback}
              onSubmitProof={onSubmitProof}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ProofHistory({
  proofs,
}: {
  proofs: NonNullable<BorrowerLoanApplicationSummary["activeLoan"]>["schedule"][number]["proofs"];
}) {
  return (
    <div className="grid gap-2 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/30 px-3 py-3">
      <p className="text-sm font-semibold">Proof history</p>
      <div className="grid gap-2">
        {proofs.map((proof) => (
          <div
            key={proof.id}
            className="grid gap-1 border-t border-[var(--border)] pt-2 text-sm first:border-t-0 first:pt-0"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="break-words font-semibold">{proof.fileName}</span>
              <ProofStatusPill status={proof.status} />
            </div>
            <p className="text-[var(--muted-foreground)]">
              Submitted {formatDate(proof.submittedAt)}
              {proof.reviewedAt ? ` · Reviewed ${formatDate(proof.reviewedAt)}` : ""}
            </p>
            {proof.reviewNotes ? (
              <p className="rounded-xl bg-white px-3 py-2 text-[var(--muted-foreground)]">
                Lender note: {proof.reviewNotes}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function RepaymentProofForm({
  isPending,
  isRejected,
  onSubmitProof,
  proofFeedback,
  repaymentId,
}: {
  isPending: boolean;
  isRejected: boolean;
  onSubmitProof: (repaymentScheduleId: string, formData: FormData) => void;
  proofFeedback: ProofFeedback | null;
  repaymentId: string;
}) {
  return (
    <form
      action={(formData) => onSubmitProof(repaymentId, formData)}
      className="grid gap-3 border-t border-[var(--border)] pt-3"
    >
      <div className="grid gap-1.5">
        <label htmlFor={`proof-${repaymentId}`} className="text-sm font-semibold">
          {isRejected ? "Upload corrected proof" : "Upload payment proof"}
        </label>
        <input
          id={`proof-${repaymentId}`}
          name="proofFile"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          disabled={isPending}
          className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-[var(--muted)] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-[var(--foreground)]"
        />
        <p className="text-xs leading-5 text-[var(--muted-foreground)]">
          JPG, PNG, WebP, or PDF up to 5 MB. Upload a new file only after a rejection or when repayment is due.
        </p>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] transition hover:bg-[#0f0f0f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
      >
        {isPending
          ? "Submitting..."
          : isRejected
            ? "Submit corrected proof"
            : "Submit proof"}
      </button>
      {proofFeedback ? (
        <ProofStatusMessage
          message={proofFeedback.message}
          tone={proofFeedback.tone}
        />
      ) : null}
    </form>
  );
}

function ActionBanner({
  message,
  title,
  tone,
}: {
  message: string;
  title: string;
  tone: "error" | "info" | "success";
}) {
  const className =
    tone === "error"
      ? "border-[#f3c7c7] bg-[#fff4f4] text-[#8f1d1d]"
      : tone === "success"
        ? "border-[#c8e6d8] bg-[#f1fbf6] text-[#0f5f45]"
        : "border-[#d8dde8] bg-[#f7f9fc] text-[var(--foreground)]";

  return (
    <div className={`rounded-2xl border px-3 py-3 text-sm leading-6 ${className}`}>
      <p className="font-semibold">{title}</p>
      {message ? <p>{message}</p> : null}
    </div>
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
  const activeLoans = applications.flatMap((application) =>
    application.activeLoan ? [application.activeLoan] : [],
  );
  const activeLoanAction = getActiveLoanHomeAction(activeLoans);

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

  if (activeLoanAction) {
    return activeLoanAction;
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
    return "Active loan";
  }

  if (status === "paid") {
    return "Loan paid";
  }

  if (status === "overdue") {
    return "Overdue";
  }

  if (status === "defaulted") {
    return "Defaulted";
  }

  if (status === "closed") {
    return "Closed";
  }

  return status;
}

function getActiveLoanHomeAction(
  loans: NonNullable<BorrowerLoanApplicationSummary["activeLoan"]>[],
) {
  const rejected = loans
    .flatMap((loan) => loan.schedule)
    .find((repayment) => repayment.latestProof?.status === "rejected");

  if (rejected) {
    return {
      action: "Go to loan",
      description:
        rejected.latestProof?.reviewNotes ||
        "Upload a corrected proof for lender review.",
      label: "",
      tab: "loans",
      title: "Proof rejected",
    } satisfies HomeSummaryContent;
  }

  const due = loans
    .flatMap((loan) => loan.schedule)
    .find((repayment) => repayment.status === "due" || repayment.status === "late");

  if (due) {
    return {
      action: "Go to loan",
      description: "Upload proof for your repayment.",
      label: "",
      tab: "loans",
      title: due.status === "late" ? "Repayment late" : "Repayment due",
    } satisfies HomeSummaryContent;
  }

  const submitted = loans
    .flatMap((loan) => loan.schedule)
    .find(
      (repayment) =>
        repayment.status === "submitted" ||
        repayment.latestProof?.status === "submitted",
    );

  if (submitted) {
    return {
      action: "View loan",
      description: "Your lender is reviewing the submitted proof.",
      label: "",
      tab: "loans",
      title: "Proof under review",
    } satisfies HomeSummaryContent;
  }

  const paidLoan = loans.find((loan) => loan.status === "paid");

  if (paidLoan) {
    return {
      action: "View loan",
      description: "Your repayment has been verified.",
      label: "",
      tab: "loans",
      title: "Loan paid",
    } satisfies HomeSummaryContent;
  }

  const verified = loans
    .flatMap((loan) => loan.schedule)
    .find(
      (repayment) =>
        repayment.status === "verified" ||
        repayment.latestProof?.status === "verified",
    );

  if (verified) {
    return {
      action: "View loan",
      description: "Your repayment proof has been verified.",
      label: "",
      tab: "loans",
      title: "Payment verified",
    } satisfies HomeSummaryContent;
  }

  if (loans.length > 0) {
    return {
      action: "View loan",
      description: "Your accepted offer is now an active loan.",
      label: "",
      tab: "loans",
      title: "Active loan",
    } satisfies HomeSummaryContent;
  }

  return null;
}

function formatRepaymentStatus(status: string) {
  if (status === "due") {
    return "Payment due";
  }

  if (status === "submitted") {
    return "Proof under review";
  }

  if (status === "verified") {
    return "Payment verified";
  }

  if (status === "rejected") {
    return "Needs corrected proof";
  }

  if (status === "late") {
    return "Late";
  }

  return status;
}

function formatProofStatus(status: string) {
  if (status === "submitted") {
    return "Waiting for review";
  }

  if (status === "verified") {
    return "Verified";
  }

  if (status === "rejected") {
    return "Rejected";
  }

  return status;
}

function getRepaymentStatusText(
  repaymentStatus: string,
  proofStatus?: string,
) {
  if (repaymentStatus === "verified" || proofStatus === "verified") {
    return "Repayment verified";
  }

  if (repaymentStatus === "submitted" || proofStatus === "submitted") {
    return "Waiting for lender review";
  }

  if (repaymentStatus === "rejected" || proofStatus === "rejected") {
    return "Proof rejected, upload a new proof";
  }

  if (repaymentStatus === "late") {
    return "Upload proof when paid";
  }

  return "Upload proof when paid";
}

function getRejectedProofNextStep(reviewNotes?: string | null) {
  const nextStep =
    "Upload a corrected proof for the same repayment so your lender can review it again.";

  if (!reviewNotes) {
    return nextStep;
  }

  return `Lender note: ${reviewNotes} ${nextStep}`;
}

function LoanStatusPill({ status }: { status: string }) {
  return (
    <span className="rounded-full bg-[#e1f5ee] px-3 py-1 text-xs font-semibold text-[#0f5f45]">
      {formatLoanPillStatus(status)}
    </span>
  );
}

function formatLoanPillStatus(status: string) {
  if (status === "active") {
    return "Active";
  }

  if (status === "paid") {
    return "Paid";
  }

  return formatLoanStatus(status);
}

function RepaymentStatusPill({ status }: { status: string }) {
  const className =
    status === "rejected"
      ? "bg-[#fff4f4] text-[#8f1d1d]"
      : status === "verified"
        ? "bg-[#e1f5ee] text-[#0f5f45]"
        : status === "submitted"
          ? "bg-[#f7f9fc] text-[var(--foreground)]"
          : "bg-[#fff4cf] text-[#6f4e00]";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      {formatRepaymentStatus(status)}
    </span>
  );
}

function ProofStatusPill({ status }: { status: string }) {
  const className =
    status === "rejected"
      ? "bg-[#fff4f4] text-[#8f1d1d]"
      : status === "verified"
        ? "bg-[#e1f5ee] text-[#0f5f45]"
        : "bg-[#f7f9fc] text-[var(--foreground)]";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      {formatProofStatus(status)}
    </span>
  );
}

function MoneyText({
  className = "",
  value,
}: {
  className?: string;
  value: number;
}) {
  return (
    <span className={`whitespace-nowrap tabular-nums ${className}`}>
      {formatMoney(value)}
    </span>
  );
}

function formatMoney(value: number) {
  return `PHP ${formatCurrency(value)}`;
}

function getNextRepayment(
  schedule: NonNullable<BorrowerLoanApplicationSummary["activeLoan"]>["schedule"],
) {
  return (
    schedule.find((repayment) =>
      ["due", "late", "rejected", "submitted"].includes(repayment.status),
    ) ?? null
  );
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
  collapsedApplicationIds = new Set<string>(),
) {
  const pendingApplicationIds = applications
    .filter((application) =>
      application.offers.some((offer) => offer.status === "pending"),
    )
    .map((application) => application.id);

  if (pendingApplicationIds.length > 0) {
    return new Set(
      pendingApplicationIds.filter((id) => !collapsedApplicationIds.has(id)),
    );
  }

  if (applications.length === 1) {
    const applicationId = applications[0].id;

    return collapsedApplicationIds.has(applicationId)
      ? new Set<string>()
      : new Set([applicationId]);
  }

  return new Set<string>();
}

function getDefaultExpandedOfferIds(
  applications: BorrowerLoanApplicationSummary[],
  collapsedOfferIds = new Set<string>(),
) {
  return new Set(
    applications.flatMap((application) =>
      application.offers
        .filter(
          (offer) =>
            offer.status === "pending" && !collapsedOfferIds.has(offer.id),
        )
        .map((offer) => offer.id),
    ),
  );
}

function getDefaultExpandedRepaymentIds(
  applications: BorrowerLoanApplicationSummary[],
  collapsedRepaymentIds = new Set<string>(),
) {
  const activeLoans = applications.flatMap((application) =>
    application.activeLoan ? [application.activeLoan] : [],
  );
  const priorityRepayments = activeLoans
    .flatMap((loan) => loan.schedule)
    .filter(
      (repayment) =>
        ["rejected", "submitted", "due", "late"].includes(repayment.status) ||
        ["rejected", "submitted"].includes(repayment.latestProof?.status ?? ""),
    );

  return new Set(
    priorityRepayments
      .map((repayment) => repayment.id)
      .filter((id) => !collapsedRepaymentIds.has(id)),
  );
}

function readStoredIdSet(key: string) {
  if (typeof window === "undefined") {
    return new Set<string>();
  }

  try {
    const storedValue = window.localStorage.getItem(key);
    const parsedValue: unknown = storedValue ? JSON.parse(storedValue) : [];

    if (!Array.isArray(parsedValue)) {
      return new Set<string>();
    }

    return new Set(
      parsedValue.filter((value): value is string => typeof value === "string"),
    );
  } catch {
    return new Set<string>();
  }
}

function writeStoredIdSet(key: string, ids: Set<string>) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify([...ids]));
  } catch {
    // Persistence should never block the borrower workflow.
  }
}

function setStoredIdCollapsed(key: string, id: string, isCollapsed: boolean) {
  const ids = readStoredIdSet(key);

  if (isCollapsed) {
    ids.add(id);
  } else {
    ids.delete(id);
  }

  writeStoredIdSet(key, ids);
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
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${getOfferStatusClassName(value)}`}
    >
      {formatApplicationStatus(value)}
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
      <dd className="mt-1 text-[var(--foreground)] tabular-nums">{value}</dd>
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
