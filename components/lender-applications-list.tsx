import Link from "next/link";
import {
  formatPreferredTerm,
  type LenderApplicationReview,
} from "@/lib/lender-applications";

type LenderApplicationsListProps = {
  applications: LenderApplicationReview[];
};

export function LenderApplicationsList({
  applications,
}: LenderApplicationsListProps) {
  if (applications.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-[var(--border)] bg-white px-4 py-8 text-center">
        <h2 className="text-xl font-semibold">No open applications</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--muted-foreground)]">
          Submitted borrower applications will appear here once ADI-10 creates
          them in Supabase for lender review and offer creation.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {applications.map((application) => (
        <article
          key={application.id}
          className="rounded-md border border-[var(--border)] bg-white px-4 py-4"
        >
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">
                  {application.portfolio.businessTypeLabel}
                </h2>
                <span className="rounded-md bg-[var(--muted)] px-2 py-1 text-xs font-semibold capitalize text-[var(--muted-foreground)]">
                  {application.status}
                </span>
              </div>
              <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                {application.portfolio.location} {" | "}
                {formatYears(application.portfolio.yearsInOperation)} in
                operation
              </p>
              <p className="text-sm leading-6">{application.purpose}</p>
            </div>
            <div className="grid gap-1 sm:text-right">
              <p className="text-sm font-semibold text-[var(--muted-foreground)]">
                Requested
              </p>
              <p className="text-2xl font-semibold">
                PHP {formatCurrency(application.requestedAmount)}
              </p>
            </div>
          </div>

          <dl className="mt-5 grid gap-3 border-t border-[var(--border)] pt-4 text-sm sm:grid-cols-4">
            <SummaryItem
              label="Preferred term"
              value={formatPreferredTerm(application.preferredTerm)}
            />
            <SummaryItem
              label="Monthly revenue"
              value={`PHP ${formatCurrency(application.portfolio.monthlyGrossRevenue)}`}
            />
            <SummaryItem
              label="Net before loans"
              value={`PHP ${formatCurrency(application.financialIndicators.estimatedNetMonthlyRevenue)}`}
            />
            <SummaryItem
              label="Submitted"
              value={formatDate(application.submittedAt)}
            />
          </dl>

          <div className="mt-5 flex justify-end">
            <Link
              href={`/lender/applications/${application.id}`}
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] transition hover:bg-[#0b5f59] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
            >
              Review application
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

export function LenderApplicationsStatus({
  message,
  tone = "neutral",
}: {
  message: string;
  tone?: "neutral" | "error";
}) {
  return (
    <div
      className="rounded-md border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 text-[var(--muted-foreground)]"
      role={tone === "error" ? "alert" : "status"}
    >
      {message}
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-semibold text-[var(--muted-foreground)]">{label}</dt>
      <dd className="mt-1 break-words text-[var(--foreground)]">{value}</dd>
    </div>
  );
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatYears(value: number) {
  if (value === 1) {
    return "1 year";
  }

  return `${new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: 1,
  }).format(value)} years`;
}
