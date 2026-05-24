import Link from "next/link";
import { LenderBottomTabs } from "@/components/lender-bottom-tabs";
import {
  formatCurrency,
  formatDate,
  formatYears,
  LenderApplicationsStatus,
} from "@/components/lender-applications-list";
import { LenderOfferForm } from "@/components/lender-offer-form";
import {
  formatPreferredTerm,
  loadLenderApplicationDetail,
} from "@/lib/lender-applications";
import type { LoanOfferSummary } from "@/lib/loan-offer";
import { openApplicationStatuses } from "@/lib/workflow-rules";

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
    return (
      <main className="min-h-svh px-5 pt-4 pb-28 sm:px-8 sm:pt-6">
        <div className="mx-auto grid max-w-4xl gap-5">
          <DetailHeader />
          <section className="grid gap-4">
            <h1 className="text-2xl leading-tight font-semibold">
              Application unavailable
            </h1>
            <LenderApplicationsStatus message={result.message} tone="error" />
          </section>
          <LenderBottomTabs activeTab="applications" />
        </div>
      </main>
    );
  }

  const { application } = result;
  const hasAcceptedOffer = application.offers.some(
    (offer) => offer.status === "accepted",
  );
  const pendingOffer = application.offers.find(
    (offer) => offer.status === "pending",
  );
  const isOpenForOffers = openApplicationStatuses.includes(
    application.status as (typeof openApplicationStatuses)[number],
  );
  const hasAcceptedApplication =
    application.status === "accepted" || hasAcceptedOffer;

  return (
    <main className="min-h-svh px-5 pt-4 pb-28 sm:px-8 sm:pt-6">
      <div className="mx-auto grid max-w-4xl gap-5">
        <DetailHeader />

        <section className="grid gap-4">
          <div className="rounded-3xl border border-[var(--border)] bg-white px-5 py-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="grid gap-1">
                <span className="w-fit rounded-full bg-[var(--muted)] px-2.5 py-1 text-xs font-semibold capitalize text-[var(--muted-foreground)]">
                  {application.status}
                </span>
                <h1 className="text-2xl leading-tight font-semibold">
                  {application.portfolio.businessTypeLabel}
                </h1>
                <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                  {application.portfolio.location} ·{" "}
                  {formatYears(application.portfolio.yearsInOperation)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-[var(--muted-foreground)]">
                  Requested
                </p>
                <p className="mt-1 text-3xl font-semibold">
                  PHP {formatCurrency(application.requestedAmount)}
                </p>
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-4 text-sm sm:grid-cols-3">
              <ReviewItem
                label="Term"
                value={formatPreferredTerm(application.preferredTerm)}
              />
              <ReviewItem label="Purpose" value={application.purpose} />
              <ReviewItem
                label="Submitted"
                value={formatDate(application.submittedAt)}
              />
            </dl>
          </div>
        </section>

        <section className="grid gap-3">
          <h2 className="text-lg font-semibold">Business and financial context</h2>
          <div className="rounded-3xl border border-[var(--border)] bg-white px-4 py-4 shadow-sm">
            <p className="text-sm leading-6">
              {application.portfolio.loanPurposeContext}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3">
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
            <Metric
              label="Borrower note"
              value={application.remarks || "No remarks"}
            />
          </dl>
        </section>

        <section className="grid gap-3">
          <h2 className="text-lg font-semibold">
            {getActionTitle({
              hasAcceptedApplication,
              isOpenForOffers,
              hasPendingOffer: Boolean(pendingOffer),
            })}
          </h2>
          <div className="rounded-3xl border border-[var(--border)] bg-white px-4 py-4 shadow-sm">
            {hasAcceptedApplication ? (
              <div className="grid gap-1 text-sm leading-6 text-[var(--muted-foreground)]">
                <p className="font-semibold text-[var(--foreground)]">
                  Offer accepted
                </p>
                <p>Offer creation is closed.</p>
              </div>
            ) : pendingOffer ? (
              <div className="grid gap-4">
                <div className="grid gap-1 text-sm leading-6 text-[var(--muted-foreground)]">
                  <p className="font-semibold text-[var(--foreground)]">
                    You already sent an offer.
                  </p>
                  <p>The borrower can review and respond to your pending offer.</p>
                </div>
                <OfferSummary offer={pendingOffer} />
              </div>
            ) : isOpenForOffers ? (
              <LenderOfferForm
                applicationId={application.id}
                requestedAmount={application.requestedAmount}
                defaultDueDate={getDefaultDueDate()}
              />
            ) : (
              <div className="grid gap-1 text-sm leading-6 text-[var(--muted-foreground)]">
                <p className="font-semibold text-[var(--foreground)]">
                  Application closed
                </p>
                <p>Offer creation is closed.</p>
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-3">
          <h2 className="text-lg font-semibold">Offer history</h2>
          {application.offers.length > 0 ? (
            <div className="grid gap-3">
              {application.offers.map((offer) => (
                <article
                  key={offer.id}
                  className={`rounded-3xl border border-[var(--border)] bg-white px-4 py-4 shadow-sm ${
                    offer.status === "pending" ? "" : "opacity-75"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-[var(--muted-foreground)]">
                        Approved
                      </p>
                      <p className="mt-1 text-2xl font-semibold">
                        PHP {formatCurrency(offer.approvedAmount)}
                      </p>
                    </div>
                    <span className="rounded-full bg-[var(--muted)] px-3 py-1 text-xs font-semibold capitalize text-[var(--muted-foreground)]">
                      {offer.status}
                    </span>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <ReviewItem
                      label="Repayment"
                      value={`PHP ${formatCurrency(offer.repaymentAmount)}`}
                    />
                    <ReviewItem
                      label="Fees"
                      value={`PHP ${formatCurrency(offer.fees)}`}
                    />
                    <ReviewItem label="Due" value={formatDateOnly(offer.dueDate)} />
                    <ReviewItem label="Sent" value={formatDate(offer.sentAt)} />
                  </dl>
                  {offer.remarks ? (
                    <p className="mt-4 text-sm leading-6 text-[var(--muted-foreground)]">
                      {offer.remarks}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[var(--border)] bg-white px-4 py-5 text-sm leading-6 text-[var(--muted-foreground)] shadow-sm">
              No offers have been sent for this application yet.
            </div>
          )}
        </section>

        <LenderBottomTabs activeTab="applications" />
      </div>
    </main>
  );
}

function DetailHeader() {
  return (
    <header className="flex min-h-10 items-center gap-3">
      <Link
        href="/lender/applications"
        aria-label="Back to applications"
        className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--foreground)] shadow-sm transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
      </Link>
      <p className="text-sm font-semibold text-[var(--foreground)]">
        Application
      </p>
    </header>
  );
}

function OfferSummary({
  offer,
}: {
  offer: LoanOfferSummary;
}) {
  return (
    <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
      <ReviewItem
        label="Approved"
        value={`PHP ${formatCurrency(offer.approvedAmount)}`}
      />
      <ReviewItem
        label="Repayment"
        value={`PHP ${formatCurrency(offer.repaymentAmount)}`}
      />
      <ReviewItem label="Due" value={formatDateOnly(offer.dueDate)} />
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
    return "Send offer";
  }

  return "Application closed";
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-[var(--muted-foreground)]">
        {label}
      </dt>
      <dd className="mt-1 break-words font-semibold">{value}</dd>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white px-3 py-4 shadow-sm">
      <dt className="text-xs font-semibold text-[var(--muted-foreground)]">
        {label}
      </dt>
      <dd className="mt-2 break-words text-base font-semibold">{value}</dd>
    </div>
  );
}

function getDefaultDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 30);

  return date.toISOString().slice(0, 10);
}

function formatDateOnly(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`));
}
