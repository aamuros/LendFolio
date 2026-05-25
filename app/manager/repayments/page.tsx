import { requireManager } from "@/lib/access-control";
import { resolveSubmittedDateRangeFilters } from "@/lib/date-ranges";
import { getShortId, loadManagerRepayments } from "@/lib/manager-operations";
import {
  AccessDenied,
  EmptyState,
  FilterGrid,
  ManagerShell,
  PersonLabel,
  SelectFilter,
  StatusBadge,
  StatusMessage,
  TextFilter,
  formatCurrency,
  formatDateOnly,
  formatDateTime,
} from "../manager-ui";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    proofStatus?: string;
    repaymentStatus?: string;
    lender?: string;
    borrower?: string;
    range?: string;
    submittedFrom?: string;
    submittedTo?: string;
  }>;
};

export default async function ManagerRepaymentsPage({ searchParams }: PageProps) {
  const filters = await searchParams;
  const access = await requireManager();

  if (!access.ok) {
    return (
      <ManagerShell
        title="Repayment proofs"
        description="Read-only monitor for repayment proof submissions and review outcomes."
        activeTab="proofs"
      >
        <AccessDenied message={access.message} />
      </ManagerShell>
    );
  }

  const submittedDateFilters = resolveSubmittedDateRangeFilters(filters);
  const result = await loadManagerRepayments(access.supabase, {
    ...filters,
    ...submittedDateFilters,
  });

  return (
    <ManagerShell
      title="Repayment proofs"
      description="Monitor submitted evidence, repayment status, and lender review notes."
      activeTab="proofs"
    >
      <FilterGrid>
        <SelectFilter
          label="Proof status"
          name="proofStatus"
          defaultValue={filters.proofStatus}
          options={[
            { value: "submitted", label: "Submitted" },
            { value: "verified", label: "Verified" },
            { value: "rejected", label: "Rejected" },
          ]}
        />
        <SelectFilter
          label="Repayment status"
          name="repaymentStatus"
          defaultValue={filters.repaymentStatus}
          options={[
            { value: "due", label: "Due" },
            { value: "submitted", label: "Submitted" },
            { value: "verified", label: "Verified" },
            { value: "rejected", label: "Rejected" },
            { value: "late", label: "Late" },
          ]}
        />
        <TextFilter label="Lender" name="lender" defaultValue={filters.lender} />
        <TextFilter
          label="Borrower"
          name="borrower"
          defaultValue={filters.borrower}
        />
        <SelectFilter
          label="Submitted range"
          name="range"
          defaultValue={filters.range}
          emptyLabel="Any time"
          options={[
            { value: "this_week", label: "This week" },
            { value: "this_month", label: "This month" },
            { value: "this_year", label: "This year" },
            { value: "custom", label: "Custom" },
          ]}
        />
        <TextFilter
          label="Submitted from"
          name="submittedFrom"
          type="date"
          defaultValue={filters.submittedFrom}
        />
        <TextFilter
          label="Submitted to"
          name="submittedTo"
          type="date"
          defaultValue={filters.submittedTo}
        />
      </FilterGrid>

      <StatusMessage message={result.message} tone={result.ok ? "neutral" : "error"} />

      <section className="grid gap-2">
        {result.proofs.length === 0 ? (
          <EmptyState
            title="No repayment proofs found"
            description="Proofs matching the current filters will appear here."
          />
        ) : null}

        {result.proofs.length > 0 ? (
          <div className="hidden rounded-t-2xl border border-[var(--border)] bg-[var(--muted)]/40 px-3 py-2 text-xs font-semibold text-[var(--muted-foreground)] sm:grid sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_0.8fr_0.75fr_auto] sm:items-center sm:gap-3">
            <span>Proof</span>
            <span>Borrower</span>
            <span>Lender</span>
            <span>Amount</span>
            <span>Status</span>
            <span className="text-right">Details</span>
          </div>
        ) : null}

        {result.proofs.map((proof) => (
          <details
            key={proof.id}
            className="group rounded-2xl border border-[var(--border)] bg-white shadow-sm [&>summary::-webkit-details-marker]:hidden"
          >
            <summary className="grid cursor-pointer list-none gap-2 px-3 py-3 text-sm transition hover:bg-[var(--muted)]/20 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_0.8fr_0.75fr_auto] sm:items-center sm:gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold">{proof.fileName}</h2>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Loan {getShortId(proof.activeLoanId)} · installment{" "}
                  {proof.installmentNumber}
                </p>
              </div>
              <div className="min-w-0 text-xs sm:text-sm">
                <PersonLabel person={proof.borrower} />
              </div>
              <div className="min-w-0 text-xs sm:text-sm">
                <PersonLabel person={proof.lender} />
              </div>
              <div className="text-sm font-semibold">
                {formatCurrency(proof.amountDue)}
                <span className="block text-xs font-normal text-[var(--muted-foreground)]">
                  Due {formatDateOnly(proof.dueDate)}
                </span>
              </div>
              <div className="flex items-center">
                <StatusBadge status={proof.proofStatus} />
              </div>
              <span className="inline-flex h-8 items-center justify-center rounded-full border border-[var(--border)] px-3 text-xs font-semibold text-[var(--foreground)] transition group-open:border-[var(--primary)] group-open:text-[var(--primary)] sm:justify-self-end">
                <span className="group-open:hidden">View details</span>
                <span className="hidden group-open:inline">Hide details</span>
              </span>
            </summary>
            <div className="border-t border-[var(--border)] bg-[var(--muted)]/10 px-3 py-3">
              <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                {proof.repaymentStatus !== proof.proofStatus ? (
                  <div className="flex items-center justify-between gap-3 border-b border-[var(--border)]/70 pb-2 sm:justify-start sm:border-b-0 sm:pb-0">
                    <dt className="text-xs font-semibold text-[var(--muted-foreground)]">
                      Repayment status
                    </dt>
                    <dd>
                      <StatusBadge status={proof.repaymentStatus} />
                    </dd>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-3 border-b border-[var(--border)]/70 pb-2 sm:justify-start sm:border-b-0 sm:pb-0">
                  <dt className="text-xs font-semibold text-[var(--muted-foreground)]">
                    Submitted
                  </dt>
                  <dd className="text-right text-xs font-semibold sm:text-left">
                    {formatDateTime(proof.submittedAt)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-[var(--border)]/70 pb-2 sm:justify-start sm:border-b-0 sm:pb-0">
                  <dt className="text-xs font-semibold text-[var(--muted-foreground)]">
                    Reviewed
                  </dt>
                  <dd className="text-right text-xs font-semibold sm:text-left">
                    {formatDateTime(proof.reviewedAt)}
                  </dd>
                </div>
                <div className="grid gap-1 sm:col-span-2">
                  <dt className="text-xs font-semibold text-[var(--muted-foreground)]">
                    Review notes
                  </dt>
                  <dd className="text-xs leading-5 text-[var(--foreground)]">
                    {proof.reviewNotes ?? "No notes"}
                  </dd>
                </div>
              </dl>
            </div>
          </details>
        ))}
      </section>
    </ManagerShell>
  );
}
