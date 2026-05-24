import Link from "next/link";
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
      <main className="min-h-svh px-5 py-6 sm:px-8">
        <div className="mx-auto grid max-w-4xl gap-8">
          <DetailHeader />
          <section className="grid gap-4 pt-4">
            <h1 className="text-4xl leading-tight font-semibold text-balance sm:text-5xl">
              Application unavailable
            </h1>
            <LenderApplicationsStatus message={result.message} tone="error" />
          </section>
        </div>
      </main>
    );
  }

  const { application } = result;

  return (
    <main className="min-h-svh px-5 py-6 sm:px-8">
      <div className="mx-auto grid max-w-4xl gap-8">
        <DetailHeader />

        <section className="grid gap-4 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-[var(--accent)]">
              Application review
            </p>
            <span className="rounded-md bg-[var(--muted)] px-2 py-1 text-xs font-semibold capitalize text-[var(--muted-foreground)]">
              {application.status}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="grid gap-3">
              <h1 className="text-4xl leading-tight font-semibold text-balance sm:text-5xl">
                {application.portfolio.businessTypeLabel}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
                {application.portfolio.location} business with{" "}
                {formatYears(application.portfolio.yearsInOperation)} in
                operation.
              </p>
            </div>
            <div className="rounded-md border border-[var(--border)] bg-white px-4 py-4 sm:min-w-56 sm:text-right">
              <p className="text-sm font-semibold text-[var(--muted-foreground)]">
                Requested amount
              </p>
              <p className="mt-1 text-3xl font-semibold">
                PHP {formatCurrency(application.requestedAmount)}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-5 border-y border-[var(--border)] py-6 sm:grid-cols-3">
          <ReviewItem
            label="Preferred term"
            value={formatPreferredTerm(application.preferredTerm)}
          />
          <ReviewItem label="Purpose" value={application.purpose} />
          <ReviewItem
            label="Submitted"
            value={formatDate(application.submittedAt)}
          />
        </section>

        <section className="grid gap-5">
          <div>
            <p className="text-sm font-semibold text-[var(--accent)]">
              Business summary
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Portfolio context</h2>
          </div>
          <div className="rounded-md border border-[var(--border)] bg-white px-4 py-4">
            <p className="text-base leading-7">
              {application.portfolio.loanPurposeContext}
            </p>
          </div>
        </section>

        <section className="grid gap-5">
          <div>
            <p className="text-sm font-semibold text-[var(--accent)]">
              Financial indicators
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              Basic monthly view
            </h2>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Metric
              label="Gross revenue"
              value={`PHP ${formatCurrency(application.portfolio.monthlyGrossRevenue)}`}
            />
            <Metric
              label="Expenses"
              value={`PHP ${formatCurrency(application.portfolio.monthlyExpenses)}`}
            />
            <Metric
              label="Existing loan payments"
              value={`PHP ${formatCurrency(application.portfolio.existingLoanPayments)}`}
            />
            <Metric
              label="Estimated net revenue"
              value={`PHP ${formatCurrency(application.financialIndicators.estimatedNetMonthlyRevenue)}`}
            />
            <Metric
              label="Cash after loan payments"
              value={`PHP ${formatCurrency(application.financialIndicators.monthlyCashAfterLoanPayments)}`}
            />
            <Metric
              label="Lender note"
              value={application.remarks || "No borrower remarks provided."}
            />
          </dl>
        </section>

        <section className="grid gap-5 border-t border-[var(--border)] pt-8">
          <div>
            <p className="text-sm font-semibold text-[var(--accent)]">
              Official offer
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              Send a pending offer
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
              This creates a basic pending offer for borrower review. Expiry
              enforcement and active loan creation are deferred.
            </p>
          </div>
          <LenderOfferForm
            applicationId={application.id}
            requestedAmount={application.requestedAmount}
            defaultDueDate={getDefaultDueDate()}
          />
        </section>

        <section className="grid gap-5">
          <div>
            <p className="text-sm font-semibold text-[var(--accent)]">
              Sent offers
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Offer status</h2>
          </div>
          {application.offers.length > 0 ? (
            <div className="grid gap-3">
              {application.offers.map((offer) => (
                <article
                  key={offer.id}
                  className="rounded-md border border-[var(--border)] bg-white px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--muted-foreground)]">
                        Approved amount
                      </p>
                      <p className="mt-1 text-2xl font-semibold">
                        PHP {formatCurrency(offer.approvedAmount)}
                      </p>
                    </div>
                    <span className="rounded-md bg-[var(--muted)] px-3 py-1 text-sm font-semibold capitalize">
                      {offer.status}
                    </span>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                    <ReviewItem
                      label="Repayment"
                      value={`PHP ${formatCurrency(offer.repaymentAmount)}`}
                    />
                    <ReviewItem
                      label="Fees"
                      value={`PHP ${formatCurrency(offer.fees)}`}
                    />
                    <ReviewItem
                      label="Due date"
                      value={formatDateOnly(offer.dueDate)}
                    />
                    <ReviewItem
                      label="Sent"
                      value={formatDate(offer.sentAt)}
                    />
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
            <div className="rounded-md border border-dashed border-[var(--border)] bg-white px-4 py-4 text-sm leading-6 text-[var(--muted-foreground)]">
              No offers have been sent for this application yet.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function DetailHeader() {
  return (
    <header className="flex items-center justify-between gap-4">
      <Link
        href="/lender/applications"
        className="text-sm font-medium text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
      >
        &lt;- Applications
      </Link>
      <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted-foreground)] uppercase">
        Detail
      </p>
    </header>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.14em] text-[var(--muted-foreground)] uppercase">
        {label}
      </p>
      <p className="mt-2 break-words text-lg font-semibold">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-white px-4 py-4">
      <dt className="text-sm font-semibold text-[var(--muted-foreground)]">
        {label}
      </dt>
      <dd className="mt-2 break-words text-xl font-semibold">{value}</dd>
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
