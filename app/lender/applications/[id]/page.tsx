import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { LenderBottomTabs } from "@/components/lender-bottom-tabs";
import { LenderPageHeader } from "@/components/lender-page-header";
import { LenderApplicationsStatus } from "@/components/lender-applications-list";
import { LenderOfferDialog } from "@/components/lender-offer-dialog";
import { formatCurrency, formatDate, formatYears } from "@/lib/lender-format";
import {
  formatPreferredTerm,
  isApplicationActionableForOffer,
  loadLenderApplicationDetail,
} from "@/lib/lender-applications";
import type { LenderApplicationReview } from "@/lib/lender-applications";
import type { LoanOfferSummary } from "@/lib/loan-offer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ToneBadge } from "@/components/borrower-status-badge";
import { cn } from "@/lib/utils";
import { formatDateOnly } from "@/lib/manager-date-format";

export const dynamic = "force-dynamic";

type LenderApplicationDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function LenderApplicationDetailPage({
  params,
}: LenderApplicationDetailPageProps) {
  const { id } = await params;
  const result = await loadLenderApplicationDetail(id);

  if (!result.ok) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[lender-applications] Application could not load for id: ${id}`,
      );
    }

    return (
      <main className="theme-lendfolio min-h-svh bg-background text-foreground">
        <LenderPageHeader activeTab="applications" />
        <div className="mx-auto max-w-7xl">
          <div className="px-4 pt-4 pb-32 sm:px-6 sm:pt-6 lg:px-8">
            <div className="mx-auto grid max-w-7xl gap-5">
              <DetailHeader />
              <section className="grid gap-4">
                <h1 className="text-2xl leading-tight font-semibold">
                  Application could not load
                </h1>
                <LenderApplicationsStatus message={result.message} tone="error" />
                <div>
                  <Button asChild className="rounded-xl">
                    <Link href="/lender/applications">
                      Back to applications
                    </Link>
                  </Button>
                </div>
              </section>
            </div>
          </div>
          <div className="sm:hidden">
            <LenderBottomTabs activeTab="applications" />
          </div>
        </div>
      </main>
    );
  }

  const { application } = result;
  const hasAcceptedOffer = application.hasAcceptedOffer;
  const pendingOffer = application.offers.find(
    (offer) => offer.status === "pending",
  );
  const isOpenForOffers = isApplicationActionableForOffer(application);
  const hasAcceptedApplication =
    application.status === "accepted" || hasAcceptedOffer;

  return (
    <main className="theme-lendfolio min-h-svh bg-background text-foreground">
      <LenderPageHeader activeTab="applications" />
      <div className="mx-auto max-w-7xl">
        <div className="px-4 pt-4 pb-32 sm:px-6 sm:pt-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2 lg:items-start">
            <BorrowerResumePage application={application} />

            <LenderReviewPage>
              <ReviewFinancialsSection application={application} />
              <ReviewCreditSection application={application} />
            </LenderReviewPage>

            <CreditProfileGradeSection application={application} />

            <OfferActionSection
              application={application}
              offers={application.offers}
              hasAcceptedApplication={hasAcceptedApplication}
              isOpenForOffers={isOpenForOffers}
              pendingOffer={pendingOffer}
            />
          </div>
        </div>

        <div className="sm:hidden">
          <LenderBottomTabs activeTab="applications" />
        </div>
      </div>
    </main>
  );
}

function DetailHeader() {
  return (
    <header className="flex min-h-10 items-center gap-3">
      <Button
        variant="ghost"
        size="icon"
        asChild
        aria-label="Back to applications"
        className="rounded-full text-muted-foreground hover:text-foreground"
      >
        <Link href="/lender/applications">
          <ArrowLeft className="size-5" />
        </Link>
      </Button>
      <p className="text-sm font-semibold text-foreground">
        Application review
      </p>
    </header>
  );
}

function DocumentPage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "min-h-0 rounded-xl border border-border/70 bg-card p-5 shadow-sm sm:p-6 lg:min-h-[520px] lg:p-8",
        className,
      )}
    >
      {children}
    </section>
  );
}

function BorrowerResumePage({
  application,
}: {
  application: Pick<
    LenderApplicationReview,
    | "status"
    | "requestedAmount"
    | "preferredTerm"
    | "purpose"
    | "submittedAt"
    | "creditReadinessStatus"
    | "remarks"
    | "portfolio"
  >;
}) {
  return (
    <DocumentPage className="grid content-start gap-7">
      <div className="grid gap-5">
        <DetailHeader />

        <div className="flex flex-wrap items-start justify-between gap-3 border-t border-border pt-5">
          <div className="grid gap-2">
            <h1 className="text-2xl leading-tight font-semibold">
              Application review
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              {application.portfolio.businessTypeLabel}
            </p>
          </div>
          <ApplicationStatusBadge status={application.status} />
        </div>
      </div>

      <div className="grid gap-5">
        <div className="grid gap-1 border-b border-border pb-5">
          <p className="text-xs font-semibold text-muted-foreground">
            Requested amount
          </p>
          <p className="text-3xl leading-tight font-semibold">
            PHP {formatCurrency(application.requestedAmount)}
          </p>
        </div>

        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <ReviewItem
            label="Location / years in operation"
            value={`${application.portfolio.location} · ${formatYears(
              application.portfolio.yearsInOperation,
            )}`}
          />
          <ReviewItem
            label="Term"
            value={formatPreferredTerm(application.preferredTerm)}
          />
          <ReviewItem label="Purpose" value={application.purpose} />
          <ReviewItem
            label="Submitted"
            value={formatDate(application.submittedAt)}
          />
          <ReviewItem
            label="Readiness"
            value={
              application.creditReadinessStatus?.replaceAll("_", " ") ??
              "Not recorded"
            }
          />
        </dl>
      </div>

      <ReviewOverviewSection application={application} />
    </DocumentPage>
  );
}

function LenderReviewPage({ children }: { children: ReactNode }) {
  return (
    <DocumentPage className="grid content-start gap-6">
      <div className="grid gap-2 border-b border-border pb-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Review summary
        </p>
        <h2 className="text-2xl font-semibold leading-tight">
          Borrower financial review
        </h2>
      </div>
      {children}
    </DocumentPage>
  );
}

function ReviewOverviewSection({
  application,
}: {
  application: Pick<LenderApplicationReview, "portfolio" | "remarks">;
}) {
  return (
    <section className="grid gap-3 border-t border-border pt-6">
      <h2 className="text-lg font-semibold">Overview</h2>
      <dl className="grid gap-4 text-sm">
        <ReviewItem
          label="Loan purpose context"
          value={application.portfolio.loanPurposeContext || "Not provided"}
        />
        <ReviewItem
          label="Borrower note"
          value={application.remarks || "No remarks"}
        />
      </dl>
    </section>
  );
}

function ReviewFinancialsSection({
  application,
}: {
  application: Pick<
    LenderApplicationReview,
    "financialIndicators" | "portfolio"
  >;
}) {
  return (
    <ReviewCard title="Financials">
      <dl className="grid grid-cols-2 gap-x-5 gap-y-4 text-sm">
        <Metric
          label="Gross revenue"
          value={`PHP ${formatCurrency(application.portfolio.monthlyGrossRevenue)}`}
        />
        <Metric
          label="Expenses"
          value={`PHP ${formatCurrency(application.portfolio.monthlyExpenses)}`}
        />
        <Metric
          label="Existing loans"
          value={`PHP ${formatCurrency(application.portfolio.existingLoanPayments)}`}
        />
        <Metric
          label="Net revenue"
          value={`PHP ${formatCurrency(application.financialIndicators.estimatedNetMonthlyRevenue)}`}
        />
        <Metric
          label="Cash after loans"
          value={`PHP ${formatCurrency(application.financialIndicators.monthlyCashAfterLoanPayments)}`}
        />
      </dl>
    </ReviewCard>
  );
}

function ReviewCreditSection({
  application,
}: {
  application: LenderApplicationReview;
}) {
  return (
    <ReviewCard title="Credit review">
      <div className="grid gap-4">
        {hasCreditSnapshot(application) ? (
          <dl className="grid grid-cols-2 gap-x-5 gap-y-4 text-sm">
            <ReviewItem
              label="Requested"
              value={`PHP ${formatCurrency(application.requestedAmount)}`}
            />
            <ReviewItem
              label="Available credit"
              value={`PHP ${formatCurrency(application.availableCreditAtSubmission)}`}
            />
            <ReviewItem
              label="Credit limit"
              value={`PHP ${formatCurrency(application.creditLimitAtSubmission)}`}
            />
            <ReviewItem
              label="Used credit"
              value={`PHP ${formatCurrency(application.usedCreditAtSubmission)}`}
            />
            <ReviewItem
              label="Net cash flow"
              value={
                application.monthlyNetCashFlowAtSubmission == null
                  ? "Not recorded"
                  : `PHP ${formatCurrency(application.monthlyNetCashFlowAtSubmission)}`
              }
            />
          </dl>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            Credit values were not recorded for this application.
          </p>
        )}

      </div>
    </ReviewCard>
  );
}

function OfferActionSection({
  application,
  offers,
  hasAcceptedApplication,
  isOpenForOffers,
  pendingOffer,
}: {
  application: Pick<
    LenderApplicationReview,
    | "id"
    | "requestedAmount"
    | "availableCreditAtSubmission"
    | "preferredTerm"
  >;
  offers: LoanOfferSummary[];
  hasAcceptedApplication: boolean;
  isOpenForOffers: boolean;
  pendingOffer: LoanOfferSummary | undefined;
}) {
  const title = getActionTitle({
    hasAcceptedApplication,
    isOpenForOffers,
    hasPendingOffer: Boolean(pendingOffer),
  });

  return (
    <ReviewCard title={title} className="h-full">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-1 text-sm leading-6 text-muted-foreground">
          <p>
            {hasAcceptedApplication
              ? "Offer creation is closed."
              : pendingOffer
                ? "A pending offer is waiting for borrower review."
                : isOpenForOffers
                  ? "Ready to prepare offer details for this application."
                  : "Offer creation is closed."}
          </p>
        </div>
        {isOpenForOffers && !pendingOffer && !hasAcceptedApplication ? (
          <LenderOfferDialog
            applicationId={application.id}
            requestedAmount={application.requestedAmount}
            availableCreditAtSubmission={application.availableCreditAtSubmission}
            defaultDueDate={getDefaultDueDate()}
            preferredTerm={application.preferredTerm}
            preferredTermLabel={formatPreferredTerm(application.preferredTerm)}
            offers={offers}
          />
        ) : null}
      </div>
      {pendingOffer ? (
        <div className="rounded-xl border border-border/60 p-4">
          <OfferSummary offer={pendingOffer} />
        </div>
      ) : null}
    </ReviewCard>
  );
}

function ApplicationStatusBadge({ status }: { status: string }) {
  const tone =
    status === "submitted"
      ? "attention"
      : status === "accepted"
        ? "success"
        : status === "rejected"
          ? "danger"
          : "neutral";

  return <ToneBadge tone={tone}>{status}</ToneBadge>;
}

function OfferSummary({
  offer,
}: {
  offer: LoanOfferSummary;
}) {
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
      <ReviewItem
        label="Approved"
        value={`PHP ${formatCurrency(offer.approvedAmount)}`}
      />
      <ReviewItem
        label="Interest/service charge"
        value={`PHP ${formatCurrency(offer.interestAmount)}`}
      />
      <ReviewItem
        label="Other borrower-paid fees"
        value={`PHP ${formatCurrency(offer.fees)}`}
      />
      <ReviewItem
        label="Total repayment"
        value={`PHP ${formatCurrency(offer.totalRepaymentAmount)}`}
      />
      <ReviewItem label="Final repayment" value={formatDateOnly(offer.dueDate)} />
      <ReviewItem label="Sent" value={formatDate(offer.sentAt)} />
    </dl>
  );
}

function getActionTitle({
  hasAcceptedApplication,
  isOpenForOffers,
  hasPendingOffer,
}: {
  hasAcceptedApplication: boolean;
  isOpenForOffers: boolean;
  hasPendingOffer: boolean;
}) {
  if (hasAcceptedApplication) {
    return "Offer accepted";
  }

  if (hasPendingOffer) {
    return "Offer pending";
  }

  if (isOpenForOffers) {
    return "Give offer";
  }

  return "Application closed";
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words font-semibold">{value}</dd>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words font-semibold">{value}</dd>
    </div>
  );
}

function hasCreditSnapshot(application: {
  creditLimitAtSubmission: number | null;
  usedCreditAtSubmission: number | null;
  availableCreditAtSubmission: number | null;
}): application is {
  creditLimitAtSubmission: number;
  usedCreditAtSubmission: number;
  availableCreditAtSubmission: number;
} {
  return (
    application.creditLimitAtSubmission !== null &&
    application.usedCreditAtSubmission !== null &&
    application.availableCreditAtSubmission !== null
  );
}

function getDefaultDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 30);

  return date.toISOString().slice(0, 10);
}

function CreditProfileGradeSection({
  application,
}: {
  application: {
    creditProfileHistory: LenderApplicationReview["creditProfileHistory"];
    creditReadinessStatus: LenderApplicationReview["creditReadinessStatus"];
  };
}) {
  const history = getLenderFacingCreditHistory(application);
  const tone = getCreditHistoryTone(history.status);

  return (
    <ReviewCard title="Credit Profile Grade">
      <div className="grid gap-3">
        <ToneBadge tone={tone}>{history.label}</ToneBadge>
        <dl className="grid grid-cols-3 gap-3 text-sm">
          <Metric
            label="Completed loan cycles"
            value={String(history.completedLoanCycles)}
          />
          <Metric
            label="On-time repayments"
            value={
              history.onTimeRepayments === null
                ? "-"
                : String(history.onTimeRepayments)
            }
          />
          <Metric label="Active loans" value={String(history.activeLoanCount)} />
        </dl>
      </div>
    </ReviewCard>
  );
}

function ReviewCard({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  title: string;
}) {
  return (
    <Card className={cn("rounded-2xl border-border/50 shadow-sm", className)}>
      <CardContent className="grid gap-4 p-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {children}
      </CardContent>
    </Card>
  );
}

function getLenderFacingCreditHistory(application: {
  creditProfileHistory: LenderApplicationReview["creditProfileHistory"];
  creditReadinessStatus: LenderApplicationReview["creditReadinessStatus"];
}): LenderApplicationReview["creditProfileHistory"] {
  if (
    application.creditReadinessStatus === "incomplete" ||
    application.creditReadinessStatus === "not_eligible"
  ) {
    return {
      ...application.creditProfileHistory,
      status: "needs_review",
      label: "Needs review",
      description:
        "Current profile or verification status needs review before an offer decision.",
    };
  }

  return application.creditProfileHistory;
}

function getCreditHistoryTone(
  status: LenderApplicationReview["creditProfileHistory"]["status"],
) {
  if (status === "needs_review") {
    return "attention";
  }

  if (status === "good_payer" || status === "strong_repeat_payer") {
    return "success";
  }

  return "neutral";
}
