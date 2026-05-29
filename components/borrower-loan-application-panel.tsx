"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { FormEventHandler, ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Controller,
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";
import {
  acceptLoanOffer,
  type BorrowerLoanApplicationSummary,
  declineLoanOffer,
  loadBorrowerLoanApplications,
  type LoanApplicationsLoadResult,
  submitRepaymentProof,
  submitLoanApplication,
  updateLoanApplication,
  withdrawLoanApplication,
} from "@/app/borrower/actions";
import { ConsentAcceptancePanel } from "@/components/consent-acceptance-panel";
import { CurrencyInput } from "@/components/currency-input";
import type { BorrowerTab } from "@/components/borrower-bottom-tabs";
import {
  canSubmitLoanApplicationForVerification,
  getBorrowerVerificationMessage,
  type BorrowerVerificationSummary,
} from "@/lib/borrower-verification";
import { borrowerPortfolioSavedEvent } from "@/lib/borrower-workflow-events";
import type { BorrowerReadinessResult } from "@/lib/borrower-readiness";
import {
  formatCreditAmount,
  type BorrowerCreditSummary,
} from "@/lib/credit-limit";
import type { ConsentStatus } from "@/lib/consents";
import {
  loanApplicationSchema,
  preferredTermLabels,
  preferredTermOptions,
  type LoanApplicationFormInput,
  type LoanApplicationInput,
} from "@/lib/loan-application";
import { parseMoneyInput } from "@/lib/money-input";
import { canEditApplication } from "@/lib/workflow-rules";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toneBadgeClassName } from "@/components/borrower-status-badge";

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
  initialLoadResult?: LoanApplicationsLoadResult | null;
};

export function BorrowerLoanApplicationPanel({
  view = "apply",
  onNavigate,
  initialLoadResult = null,
}: BorrowerLoanApplicationPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [loadState, setLoadState] = useState<LoadState>(
    initialLoadResult
      ? initialLoadResult.hasPortfolio
        ? "ready"
        : "blocked"
      : "loading",
  );
  const [hasPortfolio, setHasPortfolio] = useState(
    initialLoadResult?.hasPortfolio ?? false,
  );
  const [borrowerVerification, setBorrowerVerification] =
    useState<BorrowerVerificationSummary | null>(
      initialLoadResult?.borrowerVerification ?? null,
    );
  const [readiness, setReadiness] = useState<BorrowerReadinessResult | null>(
    initialLoadResult?.readiness ?? null,
  );
  const [message, setMessage] = useState(
    initialLoadResult ? (initialLoadResult.ok ? "" : initialLoadResult.message) : "",
  );
  const [successMessage, setSuccessMessage] = useState("");
  const [applications, setApplications] = useState<
    BorrowerLoanApplicationSummary[]
  >(initialLoadResult?.ok ? initialLoadResult.applications : []);
  const [creditSummary, setCreditSummary] =
    useState<BorrowerCreditSummary | null>(
      initialLoadResult?.creditSummary ?? null,
    );
  const [loanConsentStatus, setLoanConsentStatus] =
    useState<ConsentStatus | null>(
      initialLoadResult?.consentStatuses?.borrowerLoanApplication ?? null,
    );
  const [consentStatuses, setConsentStatuses] = useState<
    LoanApplicationsLoadResult["consentStatuses"]
  >(initialLoadResult?.consentStatuses ?? null);
  const [expandedApplicationIds, setExpandedApplicationIds] = useState<
    Set<string>
  >(() =>
    getDefaultExpandedApplicationIds(
      initialLoadResult?.ok ? initialLoadResult.applications : [],
      readStoredIdSet(collapsedApplicationsStorageKey),
    ),
  );
  const [expandedOfferIds, setExpandedOfferIds] = useState<Set<string>>(
    () =>
      getDefaultExpandedOfferIds(
        initialLoadResult?.ok ? initialLoadResult.applications : [],
        readStoredIdSet(collapsedOffersStorageKey),
      ),
  );
  const [expandedRepaymentIds, setExpandedRepaymentIds] = useState<Set<string>>(
    () =>
      getDefaultExpandedRepaymentIds(
        initialLoadResult?.ok ? initialLoadResult.applications : [],
        readStoredIdSet(collapsedRepaymentsStorageKey),
      ),
  );
  const [editingApplicationId, setEditingApplicationId] = useState<
    string | null
  >(null);
  const [proofFeedback, setProofFeedback] = useState<
    Record<string, ProofFeedback>
  >({});
  const [pendingWithdrawId, setPendingWithdrawId] = useState<string | null>(
    null,
  );

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
          setBorrowerVerification(result.borrowerVerification);
          setReadiness(result.readiness);
          setConsentStatuses(result.consentStatuses);
          setLoanConsentStatus(
            result.consentStatuses?.borrowerLoanApplication ?? null,
          );
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

    if (!initialLoadResult) {
      load();
    }
    window.addEventListener(borrowerPortfolioSavedEvent, load);

    return () => {
      isActive = false;
      window.removeEventListener(borrowerPortfolioSavedEvent, load);
    };
  }, [initialLoadResult, startTransition]);

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
  const canSubmitApplication = canSubmitLoanApplicationForVerification(
    borrowerVerification,
  );
  const borrowerVerificationMessage =
    getBorrowerVerificationMessage(borrowerVerification);

  function onSubmit(values: LoanApplicationInput) {
    if (!hasPortfolio) {
      setLoadState("blocked");
      setMessage("Save your business profile before applying.");
      return;
    }

    if (!canSubmitApplication) {
      setLoadState("ready");
      setMessage(borrowerVerificationMessage);
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

      setLoadState(
        result.mode === "missing-portfolio"
          ? "blocked"
          : result.mode === "borrower-verification" ||
            result.mode === "consent-required"
            ? "ready"
            : "error",
      );
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
    setPendingWithdrawId(applicationId);
  }

  function confirmWithdraw() {
    const applicationId = pendingWithdrawId;

    if (!applicationId) {
      return;
    }

    setPendingWithdrawId(null);
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
    <>
      <section className="grid gap-5">
        <InlineFeedback
          loadState={loadState}
          message={message}
          successMessage={successMessage}
        />

        {view === "home" ? (
          <HomeSummary
            applications={applications}
            borrowerVerification={borrowerVerification}
            consentStatuses={consentStatuses}
            creditSummary={creditSummary}
            hasPortfolio={hasPortfolio}
            loadState={loadState}
            onNavigate={onNavigate}
            readiness={readiness}
          />
        ) : null}

        {view === "apply" ? (
          <>
            <div className="grid gap-1">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl leading-tight font-semibold">Apply</h2>
                <span className="text-xs text-muted-foreground">
                  {applicationCountLabel}
                </span>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                Request financing after your business profile is saved.
              </p>
            </div>

            {!hasPortfolio ? (
              <BlockedCard
                message="Save your business profile before applying."
                onClick={() => onNavigate?.("profile")}
              />
            ) : !canSubmitApplication ? (
              <VerificationGateCard
                borrowerVerification={borrowerVerification}
                message={borrowerVerificationMessage}
              />
            ) : loanConsentStatus && !loanConsentStatus.isCurrent ? (
              <ConsentAcceptancePanel
                scope="borrower_loan_application"
                status={loanConsentStatus}
              />
            ) : (
              <ApplicationForm
                control={control}
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

      <AlertDialog
        open={pendingWithdrawId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingWithdrawId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw application?</AlertDialogTitle>
            <AlertDialogDescription>
              This will withdraw your loan application. Pending offers for this
              application will be declined.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmWithdraw}
            >
              Withdraw
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function VerificationGateCard({
  borrowerVerification,
  message,
}: {
  borrowerVerification: BorrowerVerificationSummary | null;
  message: string;
}) {
  const managerNote =
    borrowerVerification?.managerReviewNotes ??
    borrowerVerification?.rejectionReason;

  return (
    <Card className="rounded-3xl border-border/50 bg-card shadow-sm" role="status" aria-live="polite">
      <CardContent className="grid gap-3 p-5">
        <div className="grid gap-1">
          <p className="text-sm font-semibold text-foreground">
            Borrower verification
          </p>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        {managerNote ? (
          <Card className="rounded-2xl border-border/50 bg-muted/30 shadow-none">
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Manager note
              </p>
              <p className="mt-1 text-sm text-foreground">{managerNote}</p>
            </CardContent>
          </Card>
        ) : null}
      </CardContent>
    </Card>
  );
}

function HomeSummary({
  applications,
  borrowerVerification,
  consentStatuses,
  creditSummary,
  hasPortfolio,
  loadState,
  onNavigate,
  readiness,
}: {
  applications: BorrowerLoanApplicationSummary[];
  borrowerVerification: BorrowerVerificationSummary | null;
  consentStatuses: LoanApplicationsLoadResult["consentStatuses"];
  creditSummary: BorrowerCreditSummary | null;
  hasPortfolio: boolean;
  loadState: LoadState;
  onNavigate?: (tab: BorrowerTab) => void;
  readiness: BorrowerReadinessResult | null;
}) {
  const activeLoans = getActiveLoans(applications);
  const dueThisMonth = getThisMonthDue(activeLoans);
  const averageDays = getAverageDaysToPay(activeLoans);
  const debtProgress = getDebtProgress(activeLoans);
  const profileCompletion = getProfileCompletion({
    borrowerVerification,
    consentStatuses,
    creditSummary,
    hasPortfolio,
    readiness,
  });
  const calendarDays = getCalendarDaysWithDueDates(activeLoans);
  const dueUpcoming = getUpcomingDueItems(activeLoans);
  const usedCreditRatio = creditSummary
    ? getProgressRatio(
      creditSummary.usedCredit,
      creditSummary.calculatedCreditLimit,
    )
    : 0;
  const dueCapacityRatio =
    creditSummary && creditSummary.monthlyNetCashFlow > 0
      ? dueThisMonth.totalDue / creditSummary.monthlyNetCashFlow
      : null;
  const dueCapacityStatus = getDueCapacityStatus(dueCapacityRatio);
  const averageDaysRatio =
    averageDays.averageDays === null
      ? 0
      : clamp(averageDays.averageDays / getDaysInCurrentMonth(), 0, 1);
  const averageUrgency = getAverageDaysUrgency(averageDays.averageDays);

  return (
    <div className="grid gap-4 sm:gap-5">
      <div className="grid gap-1">
        <h1 className="text-2xl leading-tight font-semibold sm:text-3xl">
          Home
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Track credit capacity, repayments, and active loans.
        </p>
      </div>

      {loadState === "loading" ? (
        <HomeDashboardSkeleton />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.9fr)]">
            <Card className="rounded-3xl border-zinc-900 bg-zinc-950 py-0 text-white shadow-sm">
              <CardHeader className="p-4 pb-0 sm:p-5 sm:pb-0">
                <CardDescription className="font-semibold text-white/70">
                  Financing overview
                </CardDescription>
                <CardTitle className="text-2xl leading-tight text-white">
                  Your request capacity
                </CardTitle>
              </CardHeader>

              <CardContent className="grid gap-3 p-4 sm:p-5 xl:grid-cols-3">
                <DashboardMetricBlock title="Available to Request">
                  {creditSummary ? (
                    <>
                      <MoneyText
                        value={creditSummary.availableCredit}
                        className="text-2xl font-semibold text-white"
                      />
                      <p className="text-xs leading-5 text-white/65">
                        {formatMoney(creditSummary.availableCredit)} available of{" "}
                        {formatMoney(creditSummary.calculatedCreditLimit)} limit
                      </p>
                      <DashboardProgressBar
                        value={usedCreditRatio}
                        trackClassName="bg-white/15"
                        barClassName="bg-sky-300"
                      />
                    </>
                  ) : (
                    <p className="text-sm leading-6 text-white/70">
                      Complete your business profile to calculate your request limit.
                    </p>
                  )}
                </DashboardMetricBlock>

                <DashboardMetricBlock title="Due Within This Month">
                  <div className="flex items-end justify-between gap-3">
                    <MoneyText
                      value={dueThisMonth.totalDue}
                      className="text-2xl font-semibold text-white"
                    />
                    <Badge
                      variant="secondary"
                      className={cn(
                        "border-white/10 bg-white/10 text-xs font-semibold hover:bg-white/10",
                        dueCapacityStatus.className,
                      )}
                    >
                      {dueCapacityStatus.label}
                    </Badge>
                  </div>
                  <p className="text-xs leading-5 text-white/65">
                    {creditSummary && creditSummary.monthlyNetCashFlow > 0
                      ? `Compared with ${formatMoney(creditSummary.monthlyNetCashFlow)} monthly cashflow`
                      : "No cashflow data"}
                  </p>
                  <DashboardProgressBar
                    value={dueCapacityRatio ?? 0}
                    trackClassName="bg-white/15"
                    barClassName={dueCapacityStatus.barClassName}
                  />
                </DashboardMetricBlock>

                <DashboardMetricBlock title="Average Time to Pay All Debts">
                  <p className="text-2xl font-semibold text-white">
                    {averageDays.averageDays === null
                      ? "No unpaid debt"
                      : averageDays.averageDays < 0
                        ? "Overdue avg"
                        : `${averageDays.averageDays} days avg`}
                  </p>
                  <p className="text-xs leading-5 text-white/65">
                    Based on unpaid installments
                  </p>
                  <DashboardProgressBar
                    value={averageDaysRatio}
                    trackClassName="bg-white/15"
                    barClassName={averageUrgency.barClassName}
                  />
                </DashboardMetricBlock>
              </CardContent>
            </Card>

            <DashboardPanel title="Due dates">
          <div className="grid gap-4">
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) =>
                day ? (
                  <div
                    key={day.key}
                    className={cn(
                      "grid aspect-square min-h-10 place-items-center rounded-2xl border text-sm font-semibold",
                      day.dueItems.length > 0
                        ? "border-primary bg-primary text-primary-foreground"
                        : day.isToday
                          ? "border-primary bg-card text-foreground"
                          : "border-border bg-muted text-foreground",
                    )}
                    title={
                      day.dueItems.length > 0
                        ? `${day.dueItems.length} repayment due`
                        : undefined
                    }
                  >
                    {day.day}
                  </div>
                ) : (
                  <div key={`empty-${index}`} className="aspect-square min-h-10" />
                ),
              )}
            </div>

            <div className="grid gap-2">
              <p className="text-sm font-semibold">Upcoming</p>
              {dueUpcoming.length > 0 ? (
                dueUpcoming.map((item) => (
                  <Card key={item.repayment.id} className="rounded-2xl shadow-none border-border">
                    <CardContent className="grid gap-2 p-3 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
                      <div className="grid gap-1">
                        <p className="font-semibold">
                          Installment {item.repayment.installmentNumber}
                        </p>
                        <p className="text-muted-foreground">
                          {formatMoney(item.repayment.amountDue)} ·{" "}
                          {formatDateOnly(item.repayment.dueDate)}
                        </p>
                      </div>
                      <RepaymentStatusPill status={item.repayment.status} />
                    </CardContent>
                  </Card>
                ))
              ) : (
                <EmptyState message="No unpaid due dates this month." />
              )}
            </div>
          </div>
            </DashboardPanel>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.45fr)]">
        <div className="grid gap-4">
          <DashboardPanel title="Profile completion">
            <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
              <ProgressRing value={profileCompletion.percentage} />
              <div className="grid gap-2">
                <p className="text-sm leading-6 text-muted-foreground">
                  {profileCompletion.nextStep}
                </p>
                <Button
                  variant="outline"
                  onClick={() => onNavigate?.("profile")}
                  className="h-10 w-full rounded-full font-semibold sm:w-fit"
                >
                  Open profile
                </Button>
              </div>
            </div>
          </DashboardPanel>

          <DashboardPanel title="Debt payment progress">
            {debtProgress.totalDebt > 0 ? (
              <div className="grid gap-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <MoneyText
                      value={debtProgress.totalPaid}
                      className="text-2xl font-semibold"
                    />
                    <p className="text-sm text-muted-foreground">
                      paid of {formatMoney(debtProgress.totalDebt)}
                    </p>
                  </div>
                  <p className="text-lg font-semibold">
                    {Math.round(debtProgress.percentComplete * 100)}% complete
                  </p>
                </div>
                <DashboardProgressBar
                  value={debtProgress.percentComplete}
                  barClassName="bg-primary"
                />
              </div>
            ) : (
              <EmptyState message="Active loan progress will appear here." />
            )}
          </DashboardPanel>
        </div>

        <DashboardPanel
          title="My Loans"
          action={
            activeLoans.length > 0 ? (
              <Button
                variant="link"
                onClick={() => onNavigate?.("loans")}
                className="h-auto p-0 text-sm font-semibold"
              >
                View in Loans
              </Button>
            ) : null
          }
        >
          {activeLoans.length > 0 ? (
            <div className="grid gap-3">
              {activeLoans.map((loan) => (
                <DashboardLoanCard
                  key={loan.id}
                  loan={loan}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-3">
              <EmptyState message="Accepted offers will appear here as active loans." />
              <Button
                onClick={() => onNavigate?.("offers")}
                className="h-11 w-full rounded-full font-semibold sm:w-fit"
              >
                Review offers
              </Button>
            </div>
          )}
        </DashboardPanel>
          </div>
        </>
      )}
    </div>
  );
}

function HomeDashboardSkeleton() {
  return (
    <Card className="rounded-3xl border-border bg-card shadow-sm">
      <CardHeader className="p-4 pb-0 sm:p-5 sm:pb-0">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-7 w-48" />
      </CardHeader>
      <CardContent className="grid gap-3 p-4 sm:p-5 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <Card key={item} className="rounded-2xl border-border bg-muted/30 py-0 shadow-none">
            <CardContent className="grid gap-3 p-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-2 w-full rounded-full" />
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}

type ActiveLoan = NonNullable<BorrowerLoanApplicationSummary["activeLoan"]>;
type RepaymentScheduleItem = ActiveLoan["schedule"][number];
type DashboardDueItem = {
  loan: ActiveLoan;
  repayment: RepaymentScheduleItem;
};

function DashboardPanel({
  action = null,
  children,
  description,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <Card className="rounded-3xl border-border bg-card shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 p-4 pb-0 sm:p-5 sm:pb-0">
        <div className="grid gap-1">
          <CardTitle className="text-lg">{title}</CardTitle>
          {description ? (
            <CardDescription>{description}</CardDescription>
          ) : null}
        </div>
        {action}
      </CardHeader>
      <CardContent className="grid gap-4 p-4 sm:p-5">
        {children}
      </CardContent>
    </Card>
  );
}

function DashboardMetricBlock({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <Card className="rounded-2xl border-white/10 bg-white/[0.08] py-0 text-white shadow-none">
      <CardContent className="grid gap-3 p-4">
        <p className="text-sm font-semibold text-white/70">{title}</p>
        {children}
      </CardContent>
    </Card>
  );
}

function DashboardProgressBar({
  barClassName = "bg-primary",
  trackClassName = "bg-muted",
  value,
}: {
  barClassName?: string;
  trackClassName?: string;
  value: number;
}) {
  return (
    <div
      className={cn("h-2.5 overflow-hidden rounded-full", trackClassName)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamp(value, 0, 1) * 100)}
    >
      <div
        className={cn("h-full rounded-full", barClassName)}
        style={{ width: `${clamp(value, 0, 1) * 100}%` }}
      />
    </div>
  );
}

function ProgressRing({ value }: { value: number }) {
  const percentage = Math.round(clamp(value / 100, 0, 1) * 100);

  return (
    <div
      className="grid size-32 place-items-center rounded-full"
      style={{
        background: `conic-gradient(var(--primary) ${percentage * 3.6}deg, var(--muted) 0deg)`,
      }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percentage}
    >
      <div className="grid size-24 place-items-center rounded-full bg-card">
        <span className="text-2xl font-semibold">{percentage}%</span>
      </div>
    </div>
  );
}

function DashboardLoanCard({
  loan,
  onNavigate,
}: {
  loan: ActiveLoan;
  onNavigate?: (tab: BorrowerTab) => void;
}) {
  const installmentProgress = getLoanInstallmentProgress(loan);

  return (
    <Card className="rounded-3xl shadow-none border-border">
      <CardContent className="grid gap-4 p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="grid gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold">Loan</h3>
              <LoanStatusPill status={loan.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              Final due {formatDateOnly(loan.dueDate)}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => onNavigate?.("loans")}
            className="h-10 rounded-full font-semibold"
          >
            View in Loans
          </Button>
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <SummaryItem label="Principal" value={formatMoney(loan.principalAmount)} />
          <SummaryItem
            label="Outstanding"
            value={formatMoney(loan.outstandingBalance)}
          />
        </dl>

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <p className="font-semibold">
              {installmentProgress.completed}/{installmentProgress.total} installments
              complete
            </p>
            <p className="text-muted-foreground">
              {Math.round(installmentProgress.ratio * 100)}%
            </p>
          </div>
          <DashboardProgressBar value={installmentProgress.ratio} />
        </div>

        {installmentProgress.nextRepayment ? (
          <div className="grid gap-1 rounded-2xl bg-muted px-3 py-3 text-sm">
            <p className="font-semibold">Next unpaid installment</p>
            <p className="text-muted-foreground">
              Installment {installmentProgress.nextRepayment.installmentNumber} ·{" "}
              {formatMoney(installmentProgress.nextRepayment.amountDue)} · Due{" "}
              {formatDateOnly(installmentProgress.nextRepayment.dueDate)}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function getActiveLoans(applications: BorrowerLoanApplicationSummary[]) {
  return applications.flatMap((application) =>
    application.activeLoan ? [application.activeLoan] : [],
  );
}

function getThisMonthDue(activeLoans: ActiveLoan[]) {
  const today = new Date();
  const dueItems = activeLoans
    .flatMap((loan) =>
      loan.schedule.map((repayment) => ({ loan, repayment })),
    )
    .filter(
      ({ repayment }) =>
        isSameMonth(repayment.dueDate, today) && !isRepaymentVerified(repayment),
    );

  return {
    dueItems,
    totalDue: dueItems.reduce(
      (total, item) => total + item.repayment.amountDue,
      0,
    ),
  };
}

function getAverageDaysToPay(activeLoans: ActiveLoan[]) {
  const today = startOfLocalDay(new Date());
  const unpaidRepayments = activeLoans
    .flatMap((loan) => loan.schedule)
    .filter((repayment) => !isRepaymentVerified(repayment));

  if (unpaidRepayments.length === 0) {
    return { averageDays: null, count: 0 };
  }

  const totalDays = unpaidRepayments.reduce((total, repayment) => {
    const dueDate = parseDateOnly(repayment.dueDate);
    const days = Math.ceil(
      (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    return total + days;
  }, 0);

  return {
    averageDays: Math.round(totalDays / unpaidRepayments.length),
    count: unpaidRepayments.length,
  };
}

function getDebtProgress(activeLoans: ActiveLoan[]) {
  const totalDebt = activeLoans.reduce(
    (total, loan) => total + loan.repaymentAmount,
    0,
  );
  const totalOutstanding = activeLoans.reduce(
    (total, loan) => total + loan.outstandingBalance,
    0,
  );
  const totalPaid = Math.max(totalDebt - totalOutstanding, 0);

  return {
    percentComplete: getProgressRatio(totalPaid, totalDebt),
    totalDebt,
    totalOutstanding,
    totalPaid,
  };
}

function getLoanInstallmentProgress(loan: ActiveLoan) {
  const completed = loan.schedule.filter(isRepaymentVerified).length;
  const total = loan.schedule.length;

  return {
    completed,
    nextRepayment: getNextRepayment(loan.schedule),
    ratio: getProgressRatio(completed, total),
    total,
  };
}

function getProfileCompletion({
  borrowerVerification,
  consentStatuses,
  creditSummary,
  hasPortfolio,
  readiness,
}: {
  borrowerVerification: BorrowerVerificationSummary | null;
  consentStatuses: LoanApplicationsLoadResult["consentStatuses"];
  creditSummary: BorrowerCreditSummary | null;
  hasPortfolio: boolean;
  readiness: BorrowerReadinessResult | null;
}) {
  const verificationComplete =
    borrowerVerification?.status === "approved" &&
    borrowerVerification.documentPolicy.documentsAccepted;
  const loanConsentCurrent =
    consentStatuses?.borrowerLoanApplication.isCurrent ?? false;
  const percentage =
    (hasPortfolio ? 50 : 0) +
    (verificationComplete ? 30 : 0) +
    (loanConsentCurrent ? 10 : 0) +
    (creditSummary ? 10 : 0);

  const readinessNextStep = readiness?.nextActions[0];
  const nextStep = !hasPortfolio
    ? "Save your business profile to unlock financing."
    : !verificationComplete
      ? "Complete borrower verification before applying."
      : !loanConsentCurrent
        ? "Accept the current loan application consent."
        : !creditSummary
          ? "Update your business profile to calculate your request limit."
          : readinessNextStep ?? "Your profile is ready for financing requests.";

  return {
    nextStep,
    percentage: Math.min(percentage, 100),
  };
}

function getCalendarDaysWithDueDates(activeLoans: ActiveLoan[]) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (null | {
    day: number;
    dueItems: DashboardDueItem[];
    isToday: boolean;
    key: string;
  })[] = Array.from({ length: firstDay.getDay() }, () => null);
  const dueItemsByDay = new Map<number, DashboardDueItem[]>();

  for (const loan of activeLoans) {
    for (const repayment of loan.schedule) {
      const dueDate = parseDateOnly(repayment.dueDate);

      if (
        dueDate.getFullYear() === year &&
        dueDate.getMonth() === month &&
        !isRepaymentVerified(repayment)
      ) {
        const day = dueDate.getDate();
        const current = dueItemsByDay.get(day) ?? [];
        current.push({ loan, repayment });
        dueItemsByDay.set(day, current);
      }
    }
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push({
      day,
      dueItems: dueItemsByDay.get(day) ?? [],
      isToday: day === today.getDate(),
      key: `${year}-${month + 1}-${day}`,
    });
  }

  return days;
}

function getUpcomingDueItems(activeLoans: ActiveLoan[]) {
  const thisMonthDue = getThisMonthDue(activeLoans).dueItems;

  return thisMonthDue
    .sort(
      (left, right) =>
        parseDateOnly(left.repayment.dueDate).getTime() -
        parseDateOnly(right.repayment.dueDate).getTime(),
    )
    .slice(0, 4);
}

function getDueCapacityStatus(ratio: number | null) {
  if (ratio === null) {
    return {
      barClassName: "bg-white/35",
      className: "text-white/65",
      label: "No cashflow data",
    };
  }

  if (ratio > 0.7) {
    return {
      barClassName: "bg-red-400",
      className: "text-red-200",
      label: "Danger",
    };
  }

  if (ratio > 0.4) {
    return {
      barClassName: "bg-yellow-400",
      className: "text-yellow-200",
      label: "Caution",
    };
  }

  return {
    barClassName: "bg-emerald-400",
    className: "text-emerald-200",
    label: "Safe",
  };
}

function getAverageDaysUrgency(averageDays: number | null) {
  if (averageDays === null) {
    return { barClassName: "bg-white/35" };
  }

  if (averageDays <= 7) {
    return { barClassName: "bg-red-400" };
  }

  if (averageDays <= 14) {
    return { barClassName: "bg-yellow-400" };
  }

  return { barClassName: "bg-emerald-400" };
}

function isRepaymentVerified(repayment: RepaymentScheduleItem) {
  return (
    repayment.status === "verified" ||
    repayment.latestProof?.status === "verified"
  );
}

function getProgressRatio(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return clamp(value / total, 0, 1);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getDaysInCurrentMonth() {
  const today = new Date();

  return new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
}

function isSameMonth(dateValue: string, target: Date) {
  const date = parseDateOnly(dateValue);

  return (
    date.getFullYear() === target.getFullYear() &&
    date.getMonth() === target.getMonth()
  );
}

function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00`);
}

function startOfLocalDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function ApplicationForm({
  control,
  creditSummary,
  errors,
  isPending,
  onSubmit,
  requestedAmount,
  register,
}: {
  control: Control<LoanApplicationFormInput>;
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
    <Card className="rounded-3xl border-border/50 bg-card shadow-sm">
      <CardContent className="p-5">
        <form
          onSubmit={onSubmit}
          className="grid gap-4"
          aria-describedby="loan-application-state"
        >
          {creditSummary ? (
            <div className="rounded-2xl border border-border/50 bg-muted/30 px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground">
                Available to request
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {formatCreditAmount(creditSummary.availableCredit)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Based on your current credit profile.
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Requested amount" error={requestedAmountError} id="requestedAmount">
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
                  className="text-sm font-semibold text-destructive"
                >
                  Maximum request: {formatCreditAmount(creditSummary.availableCredit)}
                </span>
              ) : null}
            </Field>

            <Field label="Preferred term" error={errors.preferredTerm?.message} id="preferredTerm">
              <Controller
                control={control}
                name="preferredTerm"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="preferredTerm" className="h-11 rounded-xl">
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                    <SelectContent>
                      {preferredTermOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {preferredTermLabels[option]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>

          <Field label="Purpose" error={errors.purpose?.message} id="purpose">
            <Input
              id="purpose"
              className="h-11 rounded-xl"
              aria-invalid={Boolean(errors.purpose)}
              {...register("purpose")}
              placeholder="Inventory, equipment, working capital"
            />
          </Field>

          <Field label="Remarks" error={errors.remarks?.message} id="remarks">
            <Textarea
              id="remarks"
              className="rounded-xl"
              aria-invalid={Boolean(errors.remarks)}
              {...register("remarks")}
              rows={3}
              placeholder="Optional notes for the lender."
            />
          </Field>

          <Separator />

          <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
            <p
              id="loan-application-state"
              className="text-sm leading-6 text-muted-foreground"
            >
              Lenders will review your request and send offers here.
            </p>
            <Button
              type="submit"
              disabled={isPending || isOverAvailableCredit}
              className="h-12 rounded-full px-5 text-base font-semibold"
            >
              {isPending ? "Submitting..." : "Submit application"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
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
                  className="border-t border-border px-4 py-4 sm:px-5"
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

                      <div className="mt-4 grid gap-2 border-t border-border pt-4 sm:flex sm:items-center">
                        <Button
                          variant="outline"
                          disabled={!isEditable || isPending}
                          onClick={() => onEdit(application.id)}
                          className="h-11 rounded-full font-semibold"
                        >
                          Edit application
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={!isEditable || isPending}
                          onClick={() => onWithdrawApplication(application.id)}
                          className="h-11 rounded-full font-semibold text-muted-foreground hover:text-destructive"
                        >
                          Withdraw
                        </Button>
                        {!isEditable ? (
                          <p className="text-sm text-muted-foreground">
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
    <Card className="overflow-hidden rounded-3xl shadow-sm border-border bg-card">
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
    </Card>
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
      className="grid w-full gap-3 px-4 py-4 text-left transition hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring sm:grid-cols-[1.25fr_1fr_auto] sm:items-center sm:px-5"
    >
      <span className="grid gap-1">
        <span className="text-sm font-semibold text-muted-foreground">
          {label}
        </span>
        <MoneyText value={amount} className="text-2xl font-semibold" />
      </span>
      <span className="grid gap-1 text-sm text-muted-foreground">
        {metadata.slice(0, 2).map((item) => (
          <span key={item}>{item}</span>
        ))}
      </span>
      <span className="flex flex-wrap items-center gap-2 sm:justify-end">
        {status}
        <span className="text-sm font-semibold text-primary">
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
    <Card className="overflow-hidden rounded-3xl shadow-sm border-border bg-card">
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
        <div id={offerDetailsId} className="border-t border-border px-4 py-4 sm:px-5">
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <SummaryItem label="Application" value={application.purpose} />
            <SummaryItem label="Fees" value={formatMoney(offer.fees)} />
            <SummaryItem label="Sent" value={formatDate(offer.sentAt)} />
            <SummaryItem label="Remarks" value={offer.remarks || "None"} />
          </dl>

          {offer.status === "accepted" && application.activeLoan ? (
            <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <p className="text-sm leading-6 text-muted-foreground">
                Linked to loan.
              </p>
              <Button
                variant="outline"
                onClick={() => onNavigate?.("loans")}
                className="h-11 w-full rounded-full font-semibold sm:w-fit"
              >
                View loan
              </Button>
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <p className="text-sm leading-6 text-muted-foreground">
              {offer.status === "accepted" && application.activeLoan
                ? "Use Loans to track repayments."
                : "Accepting an offer closes other pending offers for this application."}
            </p>
            <div className="grid gap-2 sm:flex">
              <Button
                variant="outline"
                disabled={isPending || isClosed}
                onClick={() => onDeclineOffer(application.id, offer.id)}
                className="h-11 rounded-full font-semibold"
              >
                Decline
              </Button>
              <Button
                disabled={isPending || isClosed}
                onClick={() => onAcceptOffer(application.id, offer.id)}
                className="h-11 rounded-full font-semibold"
              >
                {offer.status === "accepted"
                  ? "Accepted"
                  : offer.status === "declined"
                    ? "Closed"
                    : isPending
                      ? "Working..."
                      : "Accept offer"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
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
    const feedbackMessage =
      loadState === "loading" ? "Loading applications..." : message.trim();

    if (!feedbackMessage) {
      return null;
    }

    return (
      <Alert variant={loadState === "error" ? "destructive" : "default"}>
        <AlertDescription
          role={loadState === "error" || loadState === "blocked" ? "alert" : "status"}
        >
          {feedbackMessage}
        </AlertDescription>
      </Alert>
    );
  }

  if (successMessage) {
    return (
      <Alert>
        <AlertDescription role="status" className="text-foreground font-semibold">
          {successMessage}
        </AlertDescription>
      </Alert>
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
    <Card className="rounded-3xl border-dashed border-border/50 bg-card shadow-sm">
      <CardContent className="grid gap-3 p-5">
        <p className="text-sm leading-6 text-muted-foreground">{message}</p>
        {onClick ? (
          <Button
            onClick={onClick}
            className="h-11 w-full rounded-full font-semibold sm:w-fit"
          >
            {action}
          </Button>
        ) : null}
      </CardContent>
    </Card>
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
      <p className="text-sm leading-6 text-muted-foreground">
        {description}
      </p>
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
      <Card className="rounded-3xl shadow-sm border-border bg-card">
        <CardContent className="grid gap-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid gap-1">
              <p className="text-sm font-semibold text-muted-foreground">
                {isCompletedLoan ? "Completed loan" : "Current loan"}
              </p>
              <MoneyText value={primaryAmount} className="text-3xl font-semibold" />
              <p className="text-sm text-muted-foreground">
                {isCompletedLoan ? "Total repaid" : "Outstanding balance"}
              </p>
            </div>
            <LoanStatusPill status={loan.status} />
          </div>

          <Separator />

          <div className="grid grid-cols-3 gap-3 text-sm">
            <SummaryItem label="Principal" value={formatMoney(loan.principalAmount)} />
            <SummaryItem label="Total repayment" value={formatMoney(loan.repaymentAmount)} />
            <SummaryItem label="Final due" value={formatDateOnly(loan.dueDate)} />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-muted-foreground">
                Progress
              </span>
              <span className="font-semibold">{progressPercent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {formatMoney(paidAmount)} paid · {formatMoney(remainingAmount)} remaining
            </p>
          </div>

          {nextRepayment ? (
            <Card className="rounded-2xl shadow-none border-border">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="grid gap-1">
                  <p className="text-sm font-semibold">Next repayment</p>
                  <p className="text-sm text-muted-foreground">
                    Due {formatDateOnly(nextRepayment.dueDate)}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <MoneyText value={nextRepayment.amountDue} className="text-lg font-semibold" />
                  <div className="mt-1">
                    <RepaymentStatusPill status={nextRepayment.status} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {isCompletedLoan ? (
            <Alert>
              <AlertDescription className="font-semibold">
                All repayments verified.
              </AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      <Card className="rounded-3xl shadow-sm border-border bg-card">
        <CardContent className="grid gap-2 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-base font-semibold">Repayment schedule</h4>
            <p className="text-sm text-muted-foreground">
              {loan.schedule.length} {loan.schedule.length === 1 ? "installment" : "installments"}
            </p>
          </div>
          {loan.schedule.length > 0 ? (
            <Card className="overflow-hidden rounded-2xl shadow-none border-border">
              <div className="divide-y divide-border">
                {loan.schedule.map((repayment) => (
                  <RepaymentScheduleRow
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
            </Card>
          ) : (
            <p className="rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm leading-6 text-muted-foreground">
              Your repayment schedule will appear here when it is ready.
            </p>
          )}
        </CardContent>
      </Card>
    </article>
  );
}

function RepaymentScheduleRow({
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
    <div className="grid gap-3 bg-card px-4 py-4">
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={repaymentDetailsId}
        onClick={onToggle}
        className="grid gap-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:grid-cols-[1fr_auto] sm:items-center"
      >
        <span className="grid gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">
              Installment {repayment.installmentNumber}
            </span>
            <RepaymentStatusPill status={repayment.status} />
            {latestProof ? <ProofStatusPill status={latestProof.status} /> : null}
          </span>
          <span className="text-sm text-muted-foreground">
            Due {formatDateOnly(repayment.dueDate)} · {statusText}
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-3 sm:justify-end">
          <MoneyText value={repayment.amountDue} className="text-xl font-semibold" />
          <span className="text-sm font-semibold text-primary">
            {isExpanded ? "Hide" : "Details"}
          </span>
        </span>
      </button>

      {isExpanded ? (
        <div id={repaymentDetailsId} className="grid gap-3 border-t border-border pt-3">
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
          {repayment.status === "late" && !isSubmitted && !isVerified ? (
            <ActionBanner
              tone="error"
              title="Payment overdue"
              message="Upload proof when payment is made."
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
    <Card className="rounded-2xl shadow-none border-border bg-muted/30">
      <CardContent className="grid gap-2 p-3">
        <p className="text-sm font-semibold">Proof history</p>
        <div className="grid gap-2">
          {proofs.map((proof) => (
            <div
              key={proof.id}
              className="grid gap-1 border-t border-border pt-2 text-sm first:border-t-0 first:pt-0"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="break-words font-semibold">{proof.fileName}</span>
                <ProofStatusPill status={proof.status} />
              </div>
              <p className="text-muted-foreground">
                Submitted {formatDate(proof.submittedAt)}
                {proof.reviewedAt ? ` · Reviewed ${formatDate(proof.reviewedAt)}` : ""}
              </p>
              {proof.reviewNotes ? (
                <p className="rounded-xl bg-card px-3 py-2 text-muted-foreground">
                  Lender note: {proof.reviewNotes}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
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
      className="grid gap-3 border-t border-border pt-3"
    >
      <div className="grid gap-1.5">
        <Label htmlFor={`proof-${repaymentId}`} className="text-sm font-semibold">
          {isRejected ? "Upload corrected proof" : "Upload proof"}
        </Label>
        <input
          id={`proof-${repaymentId}`}
          name="proofFile"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          disabled={isPending}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-secondary-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
        />
        <p className="text-xs leading-5 text-muted-foreground">
          JPG, PNG, WebP, or PDF up to 5 MB. Upload a new file only after a rejection or when repayment is due.
        </p>
      </div>
      <Button
        type="submit"
        disabled={isPending}
        className="h-11 w-full rounded-full font-semibold sm:w-fit"
      >
        {isPending
          ? "Submitting..."
          : isRejected
            ? "Submit corrected proof"
            : "Upload proof"}
      </Button>
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
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : tone === "success"
        ? "border-border bg-muted text-foreground"
        : "border-border bg-muted/30 text-foreground";

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
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : "border-border bg-muted text-foreground";

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
    control,
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
        <Field label="Requested amount" error={errors.requestedAmount?.message} id="edit-requestedAmount">
          <CurrencyInput
            className="h-11 rounded-xl"
            registration={register("requestedAmount", {
              setValueAs: parseMoneyInput,
            })}
          />
        </Field>

        <Field label="Preferred term" error={errors.preferredTerm?.message} id="edit-preferredTerm">
          <Controller
            control={control}
            name="preferredTerm"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger id="edit-preferredTerm" className="h-11 rounded-xl">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {preferredTermOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {preferredTermLabels[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </div>

      <Field label="Purpose" error={errors.purpose?.message} id="edit-purpose">
        <Input
          id="edit-purpose"
          aria-invalid={Boolean(errors.purpose)}
          {...register("purpose")}
        />
      </Field>

      <Field label="Remarks" error={errors.remarks?.message} id="edit-remarks">
        <Textarea
          id="edit-remarks"
          aria-invalid={Boolean(errors.remarks)}
          {...register("remarks")}
          rows={3}
        />
      </Field>

      <div className="grid gap-2 sm:flex sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
          className="h-11 rounded-full font-semibold"
        >
          Cancel editing
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="h-11 rounded-full font-semibold"
        >
          {isPending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
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
    return "Payment overdue";
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
  const tone = status === "overdue" ? "danger" : "success";

  return (
    <Badge
      variant="secondary"
      className={cn("text-xs font-semibold", toneBadgeClassName(tone))}
    >
      {formatLoanPillStatus(status)}
    </Badge>
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
  const tone =
    status === "rejected" || status === "late"
      ? "danger"
      : status === "verified"
        ? "success"
        : status === "submitted"
          ? "neutral"
          : "attention";

  return (
    <Badge
      variant="secondary"
      className={cn("text-xs font-semibold", toneBadgeClassName(tone))}
    >
      {formatRepaymentStatus(status)}
    </Badge>
  );
}

function ProofStatusPill({ status }: { status: string }) {
  const tone =
    status === "rejected"
      ? "danger"
      : status === "verified"
        ? "success"
        : "neutral";

  return (
    <Badge
      variant="secondary"
      className={cn("text-xs font-semibold", toneBadgeClassName(tone))}
    >
      {formatProofStatus(status)}
    </Badge>
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
    schedule.find(
      (repayment) =>
        !isRepaymentVerified(repayment) &&
        ["due", "late", "rejected", "submitted"].includes(repayment.status),
    ) ?? null
  );
}

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

function getOfferStatusTone(status: string) {
  if (status === "accepted") {
    return "success" as const;
  }

  if (status === "declined") {
    return "attention" as const;
  }

  if (status === "pending") {
    return "attention" as const;
  }

  return "neutral" as const;
}

function StatusBadge({ value }: { value: string }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "text-xs font-semibold capitalize",
        toneBadgeClassName(getOfferStatusTone(value)),
      )}
    >
      {formatApplicationStatus(value)}
    </Badge>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card className="rounded-md border-dashed shadow-none border-border bg-card">
      <CardContent className="p-4">
        <p className="text-sm leading-6 text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
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
      <dt className="font-semibold text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-foreground tabular-nums">{value}</dd>
    </div>
  );
}

type FieldProps = {
  label: string;
  error?: string;
  id?: string;
  children: ReactNode;
};

function Field({ label, error, id, children }: FieldProps) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-sm font-semibold text-foreground">
        {label}
      </Label>
      {children}
      {error ? (
        <span id={id ? `${id}-error` : undefined} className="text-sm leading-5 text-destructive">{error}</span>
      ) : null}
    </div>
  );
}
