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
      <div className="rounded-3xl border border-dashed border-[var(--border)] bg-white px-5 py-8 text-center shadow-sm">
        <h2 className="text-xl font-semibold">No open applications</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--muted-foreground)]">
          New borrower applications will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {applications.map((application) => (
        <article
          key={application.id}
          className="rounded-3xl border border-[var(--border)] bg-white px-4 py-4 shadow-sm"
        >
          <div className="grid gap-3">
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">
                  {application.portfolio.businessTypeLabel}
                </h2>
                <span className="rounded-full bg-[var(--muted)] px-2.5 py-1 text-xs font-semibold capitalize text-[var(--muted-foreground)]">
                  {application.status}
                </span>
              </div>
              <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                {application.portfolio.location}
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <SummaryItem
                label="Requested"
                value={`PHP ${formatCurrency(application.requestedAmount)}`}
              />
              <SummaryItem
                label="Term"
                value={formatPreferredTerm(application.preferredTerm)}
              />
              <SummaryItem
                label="Net revenue"
                value={`PHP ${formatCurrency(application.financialIndicators.estimatedNetMonthlyRevenue)}`}
              />
              <SummaryItem
                label="Submitted"
                value={formatDate(application.submittedAt)}
              />
            </dl>
          </div>

          <div className="mt-4 flex justify-end">
            <Link
              href={`/lender/applications/${application.id}`}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--primary)] px-5 text-sm font-semibold !text-white transition hover:bg-[#0b5f59] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
            >
              Review
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
      className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 text-[var(--muted-foreground)] shadow-sm"
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
      <dd className="mt-1 break-words font-semibold text-[var(--foreground)]">
        {value}
      </dd>
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
