"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { FormEventHandler, ReactNode } from "react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useActionState,
  useTransition,
} from "react";
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
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AlertCircle, ArrowRight } from "lucide-react";
import { toneBadgeClassName } from "@/components/borrower-status-badge";
import {
  ActionBanner,
  EmptyState,
  InlineStatus,
  PageHeader,
  StatusPill,
  SummaryItem,
  borrowerPageBottomPadding,
} from "@/components/borrower/ui";

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

type BorrowerLoanApplicationPanelProps = {
  view?: "home" | "apply" | "offers" | "loans";
  onNavigate?: (tab: BorrowerTab) => void;
  onNavigateVerification?: () => void;
  initialLoadResult?: LoanApplicationsLoadResult | null;
  highlightOfferId?: string | null;
  highlightApplicationId?: string | null;
  highlightLoanId?: string | null;
  highlightRepaymentId?: string | null;
  highlightProofId?: string | null;
};

export function BorrowerLoanApplicationPanel({
  view = "apply",
  onNavigate,
  onNavigateVerification,
  initialLoadResult = null,
  highlightOfferId = null,
  highlightApplicationId = null,
  highlightLoanId = null,
  highlightRepaymentId = null,
  highlightProofId = null,
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

  const highlightProcessedRef = useRef(false);

  useEffect(() => {
    if (highlightProcessedRef.current || applications.length === 0) {
      return;
    }

    const hasHighlight =
      highlightOfferId || highlightApplicationId || highlightRepaymentId || highlightLoanId;

    if (!hasHighlight) {
      return;
    }

    highlightProcessedRef.current = true;

    let scrollTargetId: string | null = null;

    if (highlightOfferId && view === "offers") {
      scrollTargetId = `offer-${highlightOfferId}`;
    } else if (highlightApplicationId) {
      scrollTargetId = `application-${highlightApplicationId}`;
    } else if (highlightRepaymentId && view === "loans") {
      scrollTargetId = `repayment-${highlightRepaymentId}`;
    } else if (highlightLoanId && view === "loans") {
      scrollTargetId = `loan-${highlightLoanId}`;
    }

    if (scrollTargetId) {
      requestAnimationFrame(() => {
        const el = document.getElementById(scrollTargetId!);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    }
  }, [
    applications,
    view,
    highlightOfferId,
    highlightApplicationId,
    highlightLoanId,
    highlightRepaymentId,
    highlightProofId,
  ]);

  useEffect(() => {
    if (applications.length === 0) {
      return;
    }

    if (highlightOfferId && view === "offers") {
      startTransition(() => {
        setExpandedOfferIds((current) => {
          if (current.has(highlightOfferId)) return current;
          const next = new Set(current);
          next.add(highlightOfferId);
          return next;
        });
      });
      setStoredIdCollapsed(collapsedOffersStorageKey, highlightOfferId, false);

      const parentApp = applications.find((a) =>
        a.offers.some((o) => o.id === highlightOfferId),
      );
      if (parentApp) {
        startTransition(() => {
          setExpandedApplicationIds((current) => {
            if (current.has(parentApp.id)) return current;
            const next = new Set(current);
            next.add(parentApp.id);
            return next;
          });
        });
        setStoredIdCollapsed(collapsedApplicationsStorageKey, parentApp.id, false);
      }
    } else if (highlightApplicationId) {
      startTransition(() => {
        setExpandedApplicationIds((current) => {
          if (current.has(highlightApplicationId)) return current;
          const next = new Set(current);
          next.add(highlightApplicationId);
          return next;
        });
      });
      setStoredIdCollapsed(
        collapsedApplicationsStorageKey,
        highlightApplicationId,
        false,
      );
    } else if (highlightRepaymentId && view === "loans") {
      startTransition(() => {
        setExpandedRepaymentIds((current) => {
          if (current.has(highlightRepaymentId)) return current;
          const next = new Set(current);
          next.add(highlightRepaymentId);
          return next;
        });
      });
      setStoredIdCollapsed(
        collapsedRepaymentsStorageKey,
        highlightRepaymentId,
        false,
      );
    }
  }, [
    applications,
    view,
    highlightOfferId,
    highlightApplicationId,
    highlightRepaymentId,
  ]);

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
  const hasOpenApplication = applications.some(
    (app) => app.status === "submitted" || app.status === "open",
  );

  function onSubmit(values: LoanApplicationInput) {
    if (!hasPortfolio) {
      setLoadState("blocked");
      setMessage("Save your business profile before applying.");
      return;
    }

    if (hasOpenApplication) {
      setLoadState("ready");
      setMessage(
        "You already have an open application. Withdraw it before submitting a new one.",
      );
      return;
    }

    if (!canSubmitApplication) {
      setLoadState("ready");
      setMessage(borrowerVerificationMessage);
      return;
    }

    if (
      readiness &&
      (readiness.readinessStatus === "needs_review" ||
        readiness.readinessStatus === "not_eligible" ||
        readiness.readinessStatus === "incomplete")
    ) {
      setLoadState("ready");
      setMessage(
        readiness.nextActions[0] ?? "Update your profile before applying.",
      );
      return;
    }

    if (
      creditSummary &&
      values.requestedAmount > creditSummary.availableCredit
    ) {
      setLoadState("ready");
      setMessage(
        "Requested amount exceeds your available credit. Please reduce the amount or update your profile.",
      );
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
            result.mode === "consent-required" ||
            result.mode === "readiness" ||
            result.mode === "active-application"
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

  function loadApplications() {
    void loadBorrowerLoanApplications().then((refreshed) => {
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
            onNavigateVerification={onNavigateVerification}
            readiness={readiness}
          />
        ) : null}

        {view === "apply" ? (
          <div className={cn("grid gap-5", borrowerPageBottomPadding)}>
            <PageHeader
              title="Apply"
              description="Request financing after your business profile is saved."
            >
              <Badge variant="secondary" className="text-xs font-semibold">
                {applicationCountLabel}
              </Badge>
            </PageHeader>

            {!hasPortfolio ? (
              <EmptyState
                message="Save your business profile before applying."
                action="Go to Profile"
                onAction={() => onNavigate?.("profile")}
              />
            ) : !canSubmitApplication ? (
              <VerificationGateCard
                borrowerVerification={borrowerVerification}
                message={borrowerVerificationMessage}
                onNavigateVerification={onNavigateVerification}
              />
            ) : loanConsentStatus && !loanConsentStatus.isCurrent ? (
              <ConsentAcceptancePanel
                scope="borrower_loan_application"
                status={loanConsentStatus}
                variant="dialog"
                onClose={() => onNavigate?.("home")}
                onConsentAccepted={() =>
                  setLoanConsentStatus((prev) =>
                    prev ? { ...prev, isCurrent: true, missing: [] } : prev,
                  )
                }
              />
            ) : readiness &&
              (readiness.readinessStatus === "needs_review" ||
                readiness.readinessStatus === "not_eligible" ||
                readiness.readinessStatus === "incomplete") ? (
              <ProfileReadinessBlocker
                readiness={readiness}
                onEditProfile={() => onNavigate?.("profile")}
              />
            ) : hasOpenApplication ? (
              <Card className="rounded-2xl">
                <CardContent className="flex flex-col items-center gap-2 px-4 py-8 text-center sm:px-5">
                  <AlertCircle className="size-5 text-muted-foreground" />
                  <p className="text-sm font-semibold">
                    You already have an open application
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Withdraw your current application before submitting a new
                    one.
                  </p>
                </CardContent>
              </Card>
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
          </div>
        ) : null}

        {view === "offers" ? (
          <>
            <PageHeader
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
              highlightOfferId={highlightOfferId}
            />
          </>
        ) : null}

        {view === "loans" ? (
          <>
            <PageHeader
              title="Loans"
              description="Track active loans, repayment schedules, and payment proof."
            />
            <BorrowerLoansPanel
              applications={applications}
              expandedRepaymentIds={expandedRepaymentIds}
              onNavigate={onNavigate}
              onProofSubmitted={loadApplications}
              onToggleRepayment={toggleRepayment}
              highlightRepaymentId={highlightRepaymentId}
              highlightLoanId={highlightLoanId}
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
  onNavigateVerification,
}: {
  borrowerVerification: BorrowerVerificationSummary | null;
  message: string;
  onNavigateVerification?: () => void;
}) {
  const managerNote =
    borrowerVerification?.managerReviewNotes ??
    borrowerVerification?.rejectionReason;

  return (
    <Card className="rounded-2xl" role="status" aria-live="polite">
      <CardContent className="grid gap-3 p-5">
        <div className="grid gap-1">
          <p className="text-sm font-semibold text-foreground">
            Borrower verification
          </p>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        {managerNote ? (
          <Card className="rounded-2xl bg-muted/30">
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Manager note
              </p>
              <p className="mt-1 text-sm text-foreground">{managerNote}</p>
            </CardContent>
          </Card>
        ) : null}
        {onNavigateVerification ? (
          <Button
            onClick={onNavigateVerification}
            className="w-fit rounded-full h-10 px-5 font-semibold"
          >
            Go to verification
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ProfileReadinessBlocker({
  readiness,
  onEditProfile,
}: {
  readiness: BorrowerReadinessResult;
  onEditProfile?: () => void;
}) {
  const hasVagueLoanPurpose =
    readiness.riskFlags.includes("vague_loan_purpose");
  const message = hasVagueLoanPurpose
    ? "Add more detail to your loan purpose before applying."
    : readiness.nextActions[0] ?? "Update your profile before applying.";

  return (
    <Card className="rounded-2xl" role="status" aria-live="polite">
      <CardContent className="grid gap-3 p-5">
        <div className="grid gap-1">
          <p className="text-sm font-semibold text-foreground">
            Profile update needed
          </p>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        {onEditProfile ? (
          <Button
            onClick={onEditProfile}
            className="w-fit rounded-full h-10 px-5 font-semibold"
          >
            Edit profile
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

type BorrowerDashboardState =
  | "no-profile"
  | "needs-update"
  | "verification-needed"
  | "verification-pending"
  | "ready-to-apply"
  | "active-loan";

function getBorrowerDashboardState({
  hasPortfolio,
  profileNeedsUpdate,
  borrowerVerification,
  hasActiveLoans,
}: {
  hasPortfolio: boolean;
  profileNeedsUpdate: boolean;
  borrowerVerification: BorrowerVerificationSummary | null;
  hasActiveLoans: boolean;
}): BorrowerDashboardState {
  if (!hasPortfolio) return "no-profile";
  if (profileNeedsUpdate) return "needs-update";

  const verificationStatus = borrowerVerification?.status ?? "missing";
  if (verificationStatus !== "approved") {
    if (
      verificationStatus === "submitted" ||
      verificationStatus === "under_review"
    ) {
      return "verification-pending";
    }
    return "verification-needed";
  }

  if (hasActiveLoans) return "active-loan";
  return "ready-to-apply";
}

function HomeSummary({
  applications,
  borrowerVerification,
  consentStatuses,
  creditSummary,
  hasPortfolio,
  loadState,
  onNavigate,
  onNavigateVerification,
  readiness,
}: {
  applications: BorrowerLoanApplicationSummary[];
  borrowerVerification: BorrowerVerificationSummary | null;
  consentStatuses: LoanApplicationsLoadResult["consentStatuses"];
  creditSummary: BorrowerCreditSummary | null;
  hasPortfolio: boolean;
  loadState: LoadState;
  onNavigate?: (tab: BorrowerTab) => void;
  onNavigateVerification?: () => void;
  readiness: BorrowerReadinessResult | null;
}) {
  const activeLoans = getActiveLoans(applications);
  const debtProgress = getDebtProgress(activeLoans);
  const profileCompletion = getProfileCompletion({
    borrowerVerification,
    consentStatuses,
    creditSummary,
    hasPortfolio,
    readiness,
  });
  const usedCreditRatio = creditSummary
    ? getProgressRatio(
      creditSummary.usedCredit,
      creditSummary.calculatedCreditLimit,
    )
    : 0;
  const hasActiveLoans = activeLoans.length > 0;
  const hasDebt = debtProgress.totalDebt > 0;
  const pendingOfferCount = applications.reduce(
    (count, a) =>
      count + a.offers.filter((o) => o.status === "pending").length,
    0,
  );
  const hasPendingOffers = pendingOfferCount > 0;

  const borrowerState = getBorrowerDashboardState({
    hasPortfolio,
    profileNeedsUpdate: profileCompletion.profileNeedsUpdate,
    borrowerVerification,
    hasActiveLoans,
  });

  return (
    <div className={cn("grid gap-5", borrowerPageBottomPadding)}>
      <div className="grid gap-1">
        <h1 className="text-xl leading-tight font-semibold sm:text-2xl">
          Home
        </h1>
        <p className="text-sm text-muted-foreground">
          Track credit capacity, repayments, and active loans.
        </p>
      </div>

      {loadState === "loading" ? (
        <HomeDashboardSkeleton />
      ) : (
        <div className="grid gap-4 lg:grid-cols-12">
          <PrimaryActionCard
            borrowerState={borrowerState}
            profileCompletion={profileCompletion}
            onNavigate={onNavigate}
            onNavigateVerification={onNavigateVerification}
          />

          <FinancingSummaryCard
            className="col-span-12 lg:col-span-5"
            creditSummary={creditSummary}
            hasPortfolio={hasPortfolio}
            usedCreditRatio={usedCreditRatio}
            debtProgress={debtProgress}
            hasDebt={hasDebt}
            readiness={readiness}
            onNavigate={onNavigate}
          />

          <RepaymentCalendarCard
            activeLoans={activeLoans}
            onNavigate={onNavigate}
            className="col-span-12 lg:col-span-7"
          />

          <OffersLoansCard
            className="col-span-12"
            activeLoans={activeLoans}
            hasActiveLoans={hasActiveLoans}
            hasPendingOffers={hasPendingOffers}
            pendingOfferCount={pendingOfferCount}
            onNavigate={onNavigate}
          />
        </div>
      )}
    </div>
  );
}

function PrimaryActionCard({
  borrowerState,
  profileCompletion,
  onNavigate,
  onNavigateVerification,
}: {
  borrowerState: BorrowerDashboardState;
  profileCompletion: ReturnType<typeof getProfileCompletion>;
  onNavigate?: (tab: BorrowerTab) => void;
  onNavigateVerification?: () => void;
}) {
  let title: string;
  let description: string;
  let cta: string | null;
  let badge: string | undefined;
  let showProgress: boolean;
  let handleAction: () => void;

  switch (borrowerState) {
    case "no-profile":
      title = "Complete your business profile";
      description =
        "Add your business and cashflow details to calculate your request limit.";
      cta = "Complete profile";
      badge = "Required";
      showProgress = true;
      handleAction = () => onNavigate?.("profile");
      break;
    case "needs-update":
      title = "Update your business profile";
      description = profileCompletion.nextStep;
      cta = "Update profile";
      showProgress = true;
      handleAction = () => onNavigate?.("profile");
      break;
    case "verification-needed":
      title = "Complete borrower verification";
      description =
        "Upload your required documents so your profile can be reviewed.";
      cta = "Go to verification";
      showProgress = true;
      handleAction = () => onNavigateVerification?.();
      break;
    case "verification-pending":
      title = "Verification in review";
      description =
        "Your documents are submitted. No action is needed right now.";
      cta = "View verification";
      showProgress = true;
      handleAction = () => onNavigateVerification?.();
      break;
    case "ready-to-apply":
      title = "Ready to request financing";
      description = "Your profile and verification are ready.";
      cta = "Apply for financing";
      showProgress = false;
      handleAction = () => onNavigate?.("apply");
      break;
    case "active-loan":
      title = "Track your active loan";
      description = "Review repayment dates and upload proof when needed.";
      cta = "View loans";
      showProgress = false;
      handleAction = () => onNavigate?.("loans");
      break;
  }

  return (
    <Card className="col-span-12 rounded-2xl border-border/50 bg-muted/30 shadow-sm">
      <CardContent className="grid gap-4 p-4 sm:p-5">
        <div className="grid gap-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            {badge ? (
              <Badge variant="secondary" className="text-[10px] font-semibold">
                {badge}
              </Badge>
            ) : null}
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
        {showProgress ? (
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>Profile progress</span>
              <span className="font-semibold">
                {profileCompletion.percentage}%
              </span>
            </div>
            <Progress
              value={profileCompletion.percentage}
              className="h-1.5"
            />
          </div>
        ) : null}
        {cta ? (
          <Button
            onClick={handleAction}
            className="w-full rounded-full font-semibold sm:w-fit"
          >
            {cta}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function UtilizationRing({ ratio }: { ratio: number }) {
  const size = 56;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedRatio = clamp(ratio, 0, 1);
  const offset = circumference * (1 - clampedRatio);
  const percentLabel = Math.round(clampedRatio * 100);

  const strokeColor =
    clampedRatio === 0
      ? "text-muted-foreground/40"
      : clampedRatio <= 0.5
        ? "text-emerald-500"
        : clampedRatio <= 0.75
          ? "text-amber-500"
          : "text-destructive";

  return (
    <div className="relative flex flex-col items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn("transition-all duration-500", strokeColor)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold tabular-nums">
        {percentLabel}%
      </span>
    </div>
  );
}

function FinancingSummaryCard({
  className,
  creditSummary,
  hasPortfolio,
  usedCreditRatio,
  debtProgress,
  hasDebt,
  readiness,
  onNavigate,
}: {
  className?: string;
  creditSummary: BorrowerCreditSummary | null;
  hasPortfolio: boolean;
  usedCreditRatio: number;
  debtProgress: {
    totalDebt: number;
    totalOutstanding: number;
    totalPaid: number;
    percentComplete: number;
  };
  hasDebt: boolean;
  readiness: BorrowerReadinessResult | null;
  onNavigate?: (tab: BorrowerTab) => void;
}) {
  const readinessLabel = !readiness
    ? "Pending"
    : readiness.readinessStatus === "complete" ||
        readiness.readinessStatus === "eligible_to_apply"
      ? "Complete"
      : readiness.readinessStatus === "needs_review"
        ? "Needs review"
        : readiness.readinessStatus === "not_eligible"
          ? "Not eligible"
          : "In progress";

  const readinessTone = !readiness
    ? "neutral"
    : readiness.readinessStatus === "complete" ||
        readiness.readinessStatus === "eligible_to_apply"
      ? "success"
      : readiness.readinessStatus === "not_eligible"
        ? "danger"
        : readiness.readinessStatus === "needs_review"
          ? "warning"
          : "neutral";

  return (
    <Card
      className={cn(
        "col-span-12 rounded-2xl border-border/50 shadow-sm lg:col-span-5",
        className,
      )}
    >
      <CardHeader className="px-4 pb-0 pt-4 sm:px-5 sm:pt-5">
        <CardDescription className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Financing overview
        </CardDescription>
        <CardTitle className="text-lg leading-tight sm:text-xl">
          {creditSummary ? "Available to request" : "Financing summary"}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 px-4 pb-4 sm:px-5 sm:pb-5">
        {creditSummary ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <MoneyText
                  value={creditSummary.availableCredit}
                  className="text-3xl font-semibold sm:text-4xl"
                />
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatMoney(creditSummary.availableCredit)} of{" "}
                  {formatMoney(creditSummary.calculatedCreditLimit)} limit
                </p>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <UtilizationRing ratio={usedCreditRatio} />
                <span className="text-[10px] text-muted-foreground">
                  Credit utilization
                </span>
              </div>
            </div>

            <Progress
              value={clamp((1 - usedCreditRatio) * 100, 0, 100)}
              className="h-2"
              aria-label="Available credit"
            />

            <Separator />

            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div className="grid gap-0.5">
                <p className="text-xs text-muted-foreground">Credit limit</p>
                <p className="text-sm font-semibold tabular-nums">
                  {formatMoney(creditSummary.calculatedCreditLimit)}
                </p>
              </div>
              <div className="grid gap-0.5">
                <p className="text-xs text-muted-foreground">Used credit</p>
                <p className="text-sm font-semibold tabular-nums">
                  {formatMoney(creditSummary.usedCredit)}
                </p>
              </div>
              <div className="grid gap-0.5">
                <p className="text-xs text-muted-foreground">
                  Monthly cash flow
                </p>
                <p className="text-sm font-semibold tabular-nums">
                  {formatMoney(creditSummary.monthlyNetCashFlow)}
                </p>
              </div>
              <div className="grid gap-0.5">
                <p className="text-xs text-muted-foreground">Readiness</p>
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "inline-block size-1.5 rounded-full",
                      readinessTone === "success"
                        ? "bg-emerald-500"
                        : readinessTone === "danger"
                          ? "bg-destructive"
                          : readinessTone === "warning"
                            ? "bg-amber-500"
                            : "bg-muted-foreground",
                    )}
                    aria-hidden="true"
                  />
                  <p className="text-sm font-semibold">{readinessLabel}</p>
                </div>
              </div>
            </div>

            {hasDebt ? (
              <>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <p className="text-xs text-muted-foreground">
                    Outstanding debt
                  </p>
                  <p className="font-semibold tabular-nums">
                    {formatMoney(debtProgress.totalOutstanding)}
                  </p>
                </div>
              </>
            ) : null}

            <div className="mt-auto pt-1">
              <Separator className="mb-3" />
              <Button
                variant="ghost"
                className="h-auto w-full justify-between rounded-xl px-3 py-2 text-sm"
                onClick={() => onNavigate?.("profile")}
              >
                <span className="text-muted-foreground">
                  View borrowing power
                </span>
                <ArrowRight className="size-4 text-muted-foreground" />
              </Button>
            </div>
          </>
        ) : hasPortfolio ? (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border/60 px-4 py-6 text-center">
            <p className="text-xs text-muted-foreground">
              Your credit limit will appear after your profile is evaluated.
            </p>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border/60 px-4 py-6 text-center">
            <p className="text-xs text-muted-foreground">
              Complete your business profile to calculate your request limit.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OffersLoansCard({
  className,
  activeLoans,
  hasActiveLoans,
  hasPendingOffers,
  pendingOfferCount,
  onNavigate,
}: {
  className?: string;
  activeLoans: ActiveLoan[];
  hasActiveLoans: boolean;
  hasPendingOffers: boolean;
  pendingOfferCount: number;
  onNavigate?: (tab: BorrowerTab) => void;
}) {
  return (
    <Card
      className={cn(
        "col-span-12 rounded-2xl border-border/50 shadow-sm",
        className,
      )}
    >
      <CardHeader className="px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
        <CardTitle className="text-sm font-semibold">Offers & loans</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-0.5 px-4 pb-4 sm:px-5 sm:pb-5">
        <Button
          variant="ghost"
          onClick={() => onNavigate?.("offers")}
          className="h-auto w-full justify-between gap-3 rounded-xl px-4 py-2.5"
        >
          <span className="grid gap-0.5 text-left">
            <span className="flex items-center gap-2">
              <span className="text-sm font-semibold">Offers</span>
              {pendingOfferCount > 0 ? (
                <Badge
                  variant="secondary"
                  className="text-[10px] font-semibold"
                >
                  {pendingOfferCount}
                </Badge>
              ) : null}
            </span>
            <span className="text-xs text-muted-foreground">
              {hasPendingOffers
                ? "You have pending offers"
                : "No pending offers"}
            </span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
        </Button>
        <Separator className="my-0.5" />
        <Button
          variant="ghost"
          onClick={() => onNavigate?.("loans")}
          className="h-auto w-full justify-between gap-3 rounded-xl px-4 py-2.5"
        >
          <span className="grid gap-0.5 text-left">
            <span className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                {hasActiveLoans ? "Active loans" : "Loans"}
              </span>
              {hasActiveLoans ? (
                <Badge
                  variant="secondary"
                  className="text-[10px] font-semibold"
                >
                  {activeLoans.length}
                </Badge>
              ) : null}
            </span>
            <span className="text-xs text-muted-foreground">
              {hasActiveLoans
                ? `${activeLoans.length} active loan${activeLoans.length > 1 ? "s" : ""}`
                : "No active loans"}
            </span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </CardContent>
    </Card>
  );
}

function HomeDashboardSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Card className="col-span-12 rounded-2xl border-border/50 bg-muted/30 shadow-sm">
        <CardContent className="grid gap-4 p-4 sm:p-5">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-1.5 w-full rounded-full" />
          <Skeleton className="h-11 w-40 rounded-full" />
        </CardContent>
      </Card>

      <Card className="col-span-12 rounded-2xl border-border/50 shadow-sm lg:col-span-5">
        <CardHeader className="px-4 pb-0 pt-4 sm:px-5 sm:pt-5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-4 px-4 pb-4 sm:px-5 sm:pb-5">
          <div className="flex items-center justify-between gap-3">
            <div className="grid gap-1">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-3 w-44" />
            </div>
            <Skeleton className="size-14 rounded-full" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-px w-full" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-20" />
          </div>
          <div className="mt-auto pt-1">
            <Skeleton className="mb-3 h-px w-full" />
            <Skeleton className="h-9 w-full rounded-xl" />
          </div>
        </CardContent>
      </Card>

      <Card className="col-span-12 rounded-2xl border-border/50 shadow-sm lg:col-span-7">
        <CardHeader className="px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-56" />
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-5 sm:pb-5">
          <Skeleton className="h-52 w-full rounded-xl" />
        </CardContent>
      </Card>

      <Card className="col-span-12 rounded-2xl border-border/50 shadow-sm">
        <CardContent className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 rounded-xl" />
          <Skeleton className="h-px w-full" />
          <Skeleton className="h-10 rounded-xl" />
        </CardContent>
      </Card>
    </div>
  );
}

function RepaymentCalendarCard({
  activeLoans,
  className,
  onNavigate,
}: {
  activeLoans: ActiveLoan[];
  className?: string;
  onNavigate?: (tab: BorrowerTab) => void;
}) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const today = useMemo(() => startOfLocalDay(new Date()), []);
  const isEmpty = activeLoans.length === 0;

  const dueItemsByDate = useMemo(
    () => buildDueItemsByDate(activeLoans),
    [activeLoans],
  );

  const selectedDateKey = selectedDate ? formatDateKey(selectedDate) : null;
  const selectedItems = selectedDateKey
    ? (dueItemsByDate.get(selectedDateKey) ?? [])
    : [];

  const nextRepayments = useMemo(() => {
    const allUnpaid = activeLoans
      .flatMap((loan) =>
        loan.schedule
          .filter((r) => !isRepaymentVerified(r))
          .map((r) => ({ loan, repayment: r })),
      )
      .sort(
        (a, b) =>
          parseDateOnly(a.repayment.dueDate).getTime() -
          parseDateOnly(b.repayment.dueDate).getTime(),
      );
    return allUnpaid.slice(0, 4);
  }, [activeLoans]);

  return (
    <Card className={cn("rounded-2xl border-border/50 shadow-sm", className)}>
      <CardHeader className="px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
        <CardTitle className="text-sm font-semibold">
          Repayment calendar
        </CardTitle>
        {!isEmpty ? (
          <CardDescription className="text-xs text-muted-foreground">
            Select a date to view repayment details.
          </CardDescription>
        ) : null}
      </CardHeader>
        <CardContent
          className={cn(
            "grid gap-4 px-4 pb-4 sm:px-5 sm:pb-5",
            "xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] xl:items-start",
          )}
        >
          <div className="mx-auto w-full min-w-0 max-w-[22rem] xl:mx-0 xl:min-h-[26rem]">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            defaultMonth={today}
            showOutsideDays={true}
            className="w-full rounded-2xl border border-border/50 p-3 [--cell-size:2.75rem]"
            classNames={{ root: "w-full" }}
            components={
              !isEmpty
                ? {
                    Day: ({ day, children, ...dayProps }) => {
                      const dateKey = formatDateKey(day.date);
                      const items = dueItemsByDate.get(dateKey);
                      const hasItems =
                        items !== undefined && items.length > 0;
                      const tone = hasItems
                        ? getRepaymentCalendarDateTone(items, today)
                        : null;

                      return (
                        <td {...dayProps}>
                          <div className="relative flex h-full w-full flex-col items-center justify-center">
                            {children}
                            {hasItems ? (
                              <span
                                className={cn(
                                  "pointer-events-none absolute bottom-0.5 left-1/2 z-20 size-1.5 -translate-x-1/2 rounded-full",
                                  tone === "danger"
                                    ? "bg-destructive"
                                    : tone === "neutral"
                                      ? "bg-muted-foreground"
                                      : tone === "success"
                                        ? "bg-emerald-500"
                                        : "bg-amber-500",
                                )}
                                aria-hidden="true"
                              />
                            ) : null}
                          </div>
                        </td>
                      );
                    },
                  }
                : undefined
            }
          />
        </div>

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-1 text-center xl:min-h-[26rem]">
            <p className="text-sm text-muted-foreground">
              No repayment dates yet
            </p>
            <p className="text-xs text-muted-foreground">
              Repayment dates will appear here after you accept an offer.
            </p>
          </div>
        ) : (
          <div className="grid min-w-0 gap-3">
            {selectedDate ? (
              <div className="grid gap-3 rounded-2xl border border-border/50 p-4">
                <p className="text-xs font-semibold text-muted-foreground">
                  {selectedDate.toLocaleDateString("en-PH", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                {selectedItems.length > 0 ? (
                  <div className="grid gap-2">
                    {selectedItems.map((item) => (
                      <div
                        key={item.repayment.id}
                        className="grid gap-2 rounded-xl bg-muted/30 px-3 py-2.5 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold">
                            Installment {item.repayment.installmentNumber}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateOnly(item.repayment.dueDate)}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <MoneyText
                            value={item.repayment.amountDue}
                            className="font-semibold"
                          />
                          <RepaymentStatusPill
                            status={item.repayment.status}
                          />
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigate?.("loans")}
                      className="w-full rounded-full font-semibold sm:w-fit"
                    >
                      View in Loans
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No repayments due on this date.
                  </p>
                )}
              </div>
            ) : nextRepayments.length > 0 ? (
              <div className="grid gap-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  Next repayments
                </p>
                <div className="grid gap-2">
                  {nextRepayments.map((item) => (
                    <div
                      key={item.repayment.id}
                      className="grid gap-1 rounded-xl bg-muted/30 px-3 py-2.5 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 font-semibold">
                          Installment {item.repayment.installmentNumber}
                        </p>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "shrink-0 text-[10px] font-semibold",
                            toneBadgeClassName(
                              getRepaymentCalendarTone(item.repayment, today),
                            ),
                          )}
                        >
                          {formatRepaymentStatus(item.repayment.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 text-xs text-muted-foreground">
                          {formatDateOnly(item.repayment.dueDate)}
                        </p>
                        <MoneyText
                          value={item.repayment.amountDue}
                          className="shrink-0 text-xs font-semibold"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate?.("loans")}
                  className="w-full rounded-full font-semibold"
                >
                  View all in Loans
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-border/60 p-6">
                <p className="text-xs text-muted-foreground">
                  Select a date to see repayment details.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export type ActiveLoan = NonNullable<BorrowerLoanApplicationSummary["activeLoan"]>;
export type RepaymentScheduleItem = ActiveLoan["schedule"][number];
export type DashboardDueItem = {
  loan: ActiveLoan;
  repayment: RepaymentScheduleItem;
};
export type RepaymentActionSummary = {
  overdueAmount: number;
  dueThisMonthAmount: number;
  submittedAmount: number;
  nextDueDate: string | null;
  totalNeedsAction: number;
};

function getActiveLoans(applications: BorrowerLoanApplicationSummary[]) {
  return applications.flatMap((application) =>
    application.activeLoan ? [application.activeLoan] : [],
  );
}

export function getRepaymentActionSummary(
  activeLoans: ActiveLoan[],
): RepaymentActionSummary {
  const today = new Date();
  const startOfToday = startOfLocalDay(today);
  const unpaidItems = activeLoans
    .flatMap((loan) =>
      loan.schedule.map((repayment) => ({ loan, repayment })),
    )
    .filter(({ repayment }) => !isRepaymentVerified(repayment));
  const actionableItems = unpaidItems.filter(
    ({ repayment }) => repayment.status !== "submitted",
  );
  const overdueAmount = actionableItems
    .filter(({ repayment }) => parseDateOnly(repayment.dueDate) < startOfToday)
    .reduce((total, item) => total + item.repayment.amountDue, 0);
  const dueThisMonthAmount = actionableItems
    .filter(
      ({ repayment }) =>
        isSameMonth(repayment.dueDate, today) &&
        parseDateOnly(repayment.dueDate) >= startOfToday,
    )
    .reduce((total, item) => total + item.repayment.amountDue, 0);
  const submittedAmount = unpaidItems
    .filter(({ repayment }) => repayment.status === "submitted")
    .reduce((total, item) => total + item.repayment.amountDue, 0);
  const nextDueDate =
    actionableItems
      .map(({ repayment }) => repayment.dueDate)
      .sort((a, b) => parseDateOnly(a).getTime() - parseDateOnly(b).getTime())[0] ??
    null;

  return {
    overdueAmount,
    dueThisMonthAmount,
    submittedAmount,
    nextDueDate,
    totalNeedsAction: overdueAmount + dueThisMonthAmount,
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
  const profileNeedsUpdate =
    readiness?.readinessStatus === "needs_review" ||
    readiness?.readinessStatus === "not_eligible";
  const profileHasVagueLoanPurpose =
    readiness?.riskFlags.includes("vague_loan_purpose") ?? false;
  const percentage =
    (hasPortfolio && !profileNeedsUpdate ? 50 : hasPortfolio ? 40 : 0) +
    (verificationComplete ? 30 : 0) +
    (loanConsentCurrent ? 10 : 0) +
    (creditSummary ? 10 : 0);

  const readinessNextStep = readiness?.nextActions[0];
  const nextStep = !hasPortfolio
    ? "Save your business profile to unlock financing."
    : profileNeedsUpdate
      ? profileHasVagueLoanPurpose
        ? "Add more detail to your loan purpose before applying."
        : readinessNextStep ?? "Update your profile before applying."
      : !verificationComplete
        ? "Complete borrower verification before applying."
        : !loanConsentCurrent
          ? "Accept the current loan application consent."
          : !creditSummary
            ? "Update your business profile to calculate your request limit."
            : readinessNextStep ?? "Your profile is ready for financing requests.";

  const steps = [
    { label: "Business profile", done: hasPortfolio && !profileNeedsUpdate },
    { label: "Verification", done: verificationComplete },
    { label: "Loan consent", done: loanConsentCurrent },
    { label: "Credit evaluation", done: Boolean(creditSummary) },
  ];

  return {
    nextStep,
    percentage: Math.min(percentage, 100),
    steps,
    profileNeedsUpdate,
  };
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

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function buildDueItemsByDate(
  activeLoans: ActiveLoan[],
): Map<string, DashboardDueItem[]> {
  const map = new Map<string, DashboardDueItem[]>();

  for (const loan of activeLoans) {
    for (const repayment of loan.schedule) {
      const existing = map.get(repayment.dueDate) ?? [];
      existing.push({ loan, repayment });
      map.set(repayment.dueDate, existing);
    }
  }

  return map;
}

export function getRepaymentCalendarDateTone(
  items: DashboardDueItem[],
  today: Date,
): "success" | "danger" | "attention" | "neutral" {
  const tones = items.map((item) =>
    getRepaymentCalendarTone(item.repayment, today),
  );

  if (tones.includes("danger")) {
    return "danger";
  }

  if (tones.includes("neutral")) {
    return "neutral";
  }

  if (tones.includes("attention")) {
    return "attention";
  }

  return "success";
}

export function getRepaymentCalendarTone(
  repayment: RepaymentScheduleItem,
  today: Date,
): "success" | "danger" | "attention" | "neutral" {
  if (isRepaymentVerified(repayment)) {
    return "success";
  }

  if (repayment.status === "late" || repayment.status === "rejected") {
    return "danger";
  }

  if (repayment.status === "submitted") {
    return "neutral";
  }

  const dueDate = parseDateOnly(repayment.dueDate);

  if (dueDate < today) {
    return "danger";
  }

  return "attention";
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
    <Card className="rounded-2xl">
      <CardContent className="p-5">
        <form
          onSubmit={onSubmit}
          className="grid gap-5"
          aria-describedby="loan-application-state"
        >
          {creditSummary ? (
            <div
              className={cn(
                "grid gap-3 rounded-xl p-4",
                isOverAvailableCredit
                  ? "border border-destructive/30 bg-destructive/5"
                  : "bg-muted/30",
              )}
            >
              <div className="grid gap-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Available credit
                </p>
                <p className="text-xl font-semibold tabular-nums sm:text-2xl">
                  {formatCreditAmount(creditSummary.availableCredit)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Lenders will add interest and fees on top of your principal.
                  The total repayment (principal + interest + fees) must fit
                  within this amount.
                </p>
              </div>
              {isOverAvailableCredit ? (
                <div className="flex items-start gap-1.5 text-sm font-semibold text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>
                    Requested amount exceeds your available credit.
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}

          <Field label="Requested principal amount" error={requestedAmountError} id="requestedAmount">
            <CurrencyInput
              className="h-12 rounded-xl"
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
            <span className="text-xs text-muted-foreground">
              This is the principal you want to borrow. Lenders will add interest
              and fees to determine your total repayment.
            </span>
          </Field>

          <Field label="Preferred term" error={errors.preferredTerm?.message} id="preferredTerm">
            <Controller
              control={control}
              name="preferredTerm"
              render={({ field }) => (
                <div
                  role="radiogroup"
                  id="preferredTerm"
                  className="grid grid-cols-2 gap-2"
                >
                  {preferredTermOptions.map((option) => (
                    <Button
                      key={option}
                      type="button"
                      variant={field.value === option ? "default" : "outline"}
                      onClick={() => field.onChange(option)}
                      className="h-11 rounded-xl text-sm font-semibold"
                    >
                      {preferredTermLabels[option]}
                    </Button>
                  ))}
                </div>
              )}
            />
          </Field>

          <Field label="Purpose" error={errors.purpose?.message} id="purpose">
            <Input
              id="purpose"
              className="h-12 rounded-xl"
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
              className="h-12 w-full rounded-full px-5 text-base font-semibold sm:w-auto"
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

                      <div className="mt-4 grid gap-2 sm:flex sm:items-center">
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
  highlightOfferId,
}: {
  closedOffers: OfferListItem[];
  expandedOfferIds: Set<string>;
  isPending: boolean;
  onAcceptOffer: (applicationId: string, offerId: string) => void;
  onDeclineOffer: (applicationId: string, offerId: string) => void;
  onNavigate?: (tab: BorrowerTab) => void;
  onToggleOffer: (offerId: string) => void;
  pendingOffers: OfferListItem[];
  highlightOfferId?: string | null;
}) {
  if (pendingOffers.length === 0 && closedOffers.length === 0) {
    return (
      <EmptyState
        message="Offers from lenders will appear after you submit an application."
        action="Go to Apply"
        onAction={() => onNavigate?.("apply")}
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
                isHighlighted={item.offer.id === highlightOfferId}
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
                isHighlighted={item.offer.id === highlightOfferId}
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
    <Card className="overflow-hidden rounded-2xl">
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
  isHighlighted,
}: {
  isExpanded: boolean;
  isPending: boolean;
  item: OfferListItem;
  onAcceptOffer: (applicationId: string, offerId: string) => void;
  onDeclineOffer: (applicationId: string, offerId: string) => void;
  onNavigate?: (tab: BorrowerTab) => void;
  onToggleOffer: (offerId: string) => void;
  isHighlighted?: boolean;
}) {
  const { application, offer } = item;
  const offerDetailsId = `offer-${offer.id}-details`;
  const isClosed = offer.status !== "pending";

  return (
    <Card
      id={`offer-${offer.id}`}
      className={cn(
        "overflow-hidden rounded-2xl",
        isHighlighted && "ring-2 ring-primary/30",
      )}
    >
      <BorrowerListCardHeader
        detailsId={offerDetailsId}
        isExpanded={isExpanded}
        label={offer.lenderName}
        amount={offer.approvedAmount}
        metadata={[
          `Total repayment ${formatMoney(offer.totalRepaymentAmount)}`,
          `Final repayment ${formatDateOnly(offer.dueDate)}`,
        ]}
        status={<StatusBadge value={offer.status} />}
        onToggle={() => onToggleOffer(offer.id)}
      />

      {isExpanded ? (
        <div id={offerDetailsId} className="border-t border-border px-4 py-4 sm:px-5">
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <SummaryItem label="Application" value={application.purpose} />
            <SummaryItem label="You receive (principal)" value={formatMoney(offer.principalAmount)} />
            <SummaryItem label="Interest/service charge" value={formatMoney(offer.interestAmount)} />
            <SummaryItem label="Other fees" value={formatMoney(offer.fees)} />
            <SummaryItem label="Total you repay" value={formatMoney(offer.totalRepaymentAmount)} />
            <SummaryItem label="Sent" value={formatDate(offer.sentAt)} />
            <SummaryItem label="Remarks" value={offer.remarks || "None"} />
          </dl>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Total repayment includes principal, interest/service charge, and other fees. This is the full amount you will repay.
          </p>

          {offer.repaymentChannel ? (
            <div className="mt-3 grid gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <p className="text-sm font-semibold">Repayment destination</p>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <SummaryItem label="Channel" value={offer.repaymentChannel} />
                <SummaryItem label="Account name" value={offer.repaymentAccountName ?? ""} />
                <SummaryItem label="Account number" value={offer.repaymentAccountNumber ?? ""} />
                {offer.repaymentInstructions ? (
                  <SummaryItem label="Instructions" value={offer.repaymentInstructions} />
                ) : null}
              </dl>
            </div>
          ) : null}

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
      <p
        role="status"
        className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm leading-6 font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
      >
        {successMessage}
      </p>
    );
  }

  return null;
}

function BorrowerLoansPanel({
  applications,
  expandedRepaymentIds,
  onNavigate,
  onProofSubmitted,
  onToggleRepayment,
  highlightRepaymentId,
  highlightLoanId,
}: {
  applications: BorrowerLoanApplicationSummary[];
  expandedRepaymentIds: Set<string>;
  onNavigate?: (tab: BorrowerTab) => void;
  onProofSubmitted: () => void;
  onToggleRepayment: (repaymentScheduleId: string) => void;
  highlightRepaymentId?: string | null;
  highlightLoanId?: string | null;
}) {
  const activeLoans = applications.flatMap((application) =>
    application.activeLoan ? [application.activeLoan] : [],
  );

  if (activeLoans.length === 0) {
    return (
      <EmptyState
        message="When you accept an offer, the active loan and repayment schedule will appear here."
        action="Review offers"
        onAction={() => onNavigate?.("offers")}
      />
    );
  }

  return (
    <div className="grid gap-4">
      {activeLoans.map((loan) => (
        <ActiveLoanCard
          key={loan.id}
          expandedRepaymentIds={expandedRepaymentIds}
          loan={loan}
          onProofSubmitted={onProofSubmitted}
          onToggleRepayment={onToggleRepayment}
          isHighlighted={loan.id === highlightLoanId}
          highlightRepaymentId={highlightRepaymentId}
        />
      ))}
    </div>
  );
}

function ActiveLoanCard({
  expandedRepaymentIds,
  loan,
  onProofSubmitted,
  onToggleRepayment,
  isHighlighted,
  highlightRepaymentId,
}: {
  expandedRepaymentIds: Set<string>;
  loan: NonNullable<BorrowerLoanApplicationSummary["activeLoan"]>;
  onProofSubmitted: () => void;
  onToggleRepayment: (repaymentScheduleId: string) => void;
  isHighlighted?: boolean;
  highlightRepaymentId?: string | null;
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
  const scheduleTotal = loan.schedule.reduce(
    (total, repayment) => total + repayment.amountDue,
    0,
  );

  return (
    <article id={`loan-${loan.id}`} className="grid gap-4">
      <Card className={cn("rounded-2xl", isHighlighted && "ring-2 ring-primary/30")}>
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

          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <SummaryItem label="Principal" value={formatMoney(loan.principalAmount)} />
            <SummaryItem label="Interest/service charge" value={formatMoney(loan.interestAmount)} />
            <SummaryItem label="Other fees" value={formatMoney(loan.fees)} />
            <SummaryItem label="Total repayment" value={formatMoney(loan.totalRepaymentAmount)} />
            <SummaryItem label="Schedule total" value={formatMoney(scheduleTotal)} />
            <SummaryItem label="Final due" value={formatDateOnly(loan.dueDate)} />
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            Total repayment includes principal, interest/service charge, and other fees.
          </p>

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
            <Card className="rounded-xl">
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

          {loan.repaymentChannel ? (
            <Card className="rounded-xl border-primary/20 bg-primary/5">
              <CardContent className="grid gap-3 p-4">
                <p className="text-sm font-semibold">Repayment destination</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  Send your repayment to the account below, then upload proof of payment.
                </p>
                <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-2">
                  <SummaryItem label="Channel" value={loan.repaymentChannel} />
                  <SummaryItem label="Account name" value={loan.repaymentAccountName ?? ""} />
                  <SummaryItem label="Account number" value={loan.repaymentAccountNumber ?? ""} />
                  {loan.repaymentInstructions ? (
                    <SummaryItem label="Instructions" value={loan.repaymentInstructions} />
                  ) : null}
                </dl>
                {loan.additionalRepaymentChannels.length > 0 ? (
                  <div className="grid gap-2 border-t border-primary/10 pt-2">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Additional channels
                    </p>
                    {loan.additionalRepaymentChannels.map((ch) => (
                      <dl key={ch.id} className="grid grid-cols-2 gap-2 text-sm">
                        <SummaryItem label="Channel" value={ch.channel} />
                        <SummaryItem label="Account name" value={ch.accountName} />
                        <SummaryItem label="Account number" value={ch.accountNumber} />
                        {ch.instructions ? (
                          <SummaryItem label="Instructions" value={ch.instructions} />
                        ) : null}
                      </dl>
                    ))}
                  </div>
                ) : null}
                <p className="text-xs leading-5 text-muted-foreground">
                  Repayment happens outside this app. Upload proof here after you pay so your lender can verify it.
                </p>
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

      <Card className="rounded-2xl">
        <CardContent className="grid gap-2 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-base font-semibold">Repayment schedule</h4>
            <p className="text-sm text-muted-foreground">
              {loan.schedule.length} {loan.schedule.length === 1 ? "installment" : "installments"}
            </p>
          </div>
          {loan.schedule.length > 0 ? (
            <Card className="overflow-hidden rounded-xl">
              <div className="divide-y divide-border">
                {loan.schedule.map((repayment) => (
                  <RepaymentScheduleRow
                    key={repayment.id}
                    isExpanded={expandedRepaymentIds.has(repayment.id)}
                    repayment={repayment}
                    repaymentChannel={loan.repaymentChannel}
                    repaymentAccountName={loan.repaymentAccountName}
                    repaymentAccountNumber={loan.repaymentAccountNumber}
                    repaymentInstructions={loan.repaymentInstructions}
                    additionalRepaymentChannels={loan.additionalRepaymentChannels}
                    onProofSubmitted={onProofSubmitted}
                    onToggle={() => onToggleRepayment(repayment.id)}
                    isHighlighted={repayment.id === highlightRepaymentId}
                  />
                ))}
              </div>
            </Card>
          ) : (
            <p className="rounded-xl bg-muted/30 px-4 py-3 text-sm leading-6 text-muted-foreground">
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
  onToggle,
  repayment,
  repaymentChannel,
  repaymentAccountName,
  repaymentAccountNumber,
  repaymentInstructions,
  additionalRepaymentChannels,
  onProofSubmitted,
  isHighlighted,
}: {
  isExpanded: boolean;
  onToggle: () => void;
  repayment: NonNullable<BorrowerLoanApplicationSummary["activeLoan"]>["schedule"][number];
  repaymentChannel: string | null;
  repaymentAccountName: string | null;
  repaymentAccountNumber: string | null;
  repaymentInstructions: string | null;
  additionalRepaymentChannels: NonNullable<BorrowerLoanApplicationSummary["activeLoan"]>["additionalRepaymentChannels"];
  onProofSubmitted: () => void;
  isHighlighted?: boolean;
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
    <div
      id={`repayment-${repayment.id}`}
      className={cn("grid gap-3 bg-card px-4 py-4", isHighlighted && "ring-2 ring-primary/30")}
    >
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

          {canUploadProof && repaymentChannel ? (
            <Card className="rounded-xl border-primary/20 bg-primary/5">
              <CardContent className="grid gap-2 p-3">
                <p className="text-sm font-semibold">
                  Send {formatMoney(repayment.amountDue)} to the repayment destination below, then upload proof.
                </p>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <SummaryItem label="Channel" value={repaymentChannel} />
                  <SummaryItem label="Account name" value={repaymentAccountName ?? ""} />
                  <SummaryItem label="Account number" value={repaymentAccountNumber ?? ""} />
                  {repaymentInstructions ? (
                    <SummaryItem label="Instructions" value={repaymentInstructions} />
                  ) : null}
                </dl>
                {additionalRepaymentChannels.length > 0 ? (
                  <div className="grid gap-2 border-t border-primary/10 pt-2">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Additional channels
                    </p>
                    {additionalRepaymentChannels.map((ch) => (
                      <dl key={ch.id} className="grid grid-cols-2 gap-2 text-sm">
                        <SummaryItem label="Channel" value={ch.channel} />
                        <SummaryItem label="Account name" value={ch.accountName} />
                        <SummaryItem label="Account number" value={ch.accountNumber} />
                        {ch.instructions ? (
                          <SummaryItem label="Instructions" value={ch.instructions} />
                        ) : null}
                      </dl>
                    ))}
                  </div>
                ) : null}
                <p className="text-xs leading-5 text-muted-foreground">
                  Repayment happens outside this app. Upload proof here after you pay so your lender can verify it.
                </p>
              </CardContent>
            </Card>
          ) : null}

          {repayment.proofs.length > 0 ? (
            <ProofHistory proofs={repayment.proofs} />
          ) : null}

          {canUploadProof ? (
            <RepaymentProofForm
              isRejected={isRejected}
              repaymentId={repayment.id}
              onSuccess={onProofSubmitted}
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
    <Card className="rounded-xl bg-muted/30">
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
  isRejected,
  repaymentId,
  onSuccess,
}: {
  isRejected: boolean;
  repaymentId: string;
  onSuccess: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    submitRepaymentProof,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      onSuccess();
    }
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="grid gap-3 border-t border-border pt-3">
      <input type="hidden" name="repaymentScheduleId" value={repaymentId} />
      <div className="grid gap-1.5">
        <Label htmlFor={`proof-${repaymentId}`} className="text-sm font-semibold">
          {isRejected ? "Upload corrected proof" : "Upload proof"}
        </Label>
        <input
          id={`proof-${repaymentId}`}
          name="proofFile"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
          disabled={isPending}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-secondary-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
        />
        <p className="text-xs leading-5 text-muted-foreground">
          JPG, PNG, WebP, HEIC, or PDF up to 5 MB. Upload a new file only after a rejection or when repayment is due.
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
      {state ? (
        <InlineStatus
          message={state.message}
          tone={state.ok ? "success" : "error"}
        />
      ) : null}
    </form>
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
    <StatusPill tone={tone}>{formatLoanPillStatus(status)}</StatusPill>
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
    <StatusPill tone={tone}>{formatRepaymentStatus(status)}</StatusPill>
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
    <StatusPill tone={tone}>{formatProofStatus(status)}</StatusPill>
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
    <StatusPill tone={getOfferStatusTone(value)}>
      {formatApplicationStatus(value)}
    </StatusPill>
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
