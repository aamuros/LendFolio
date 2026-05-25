import Link from "next/link";
import { requireManager } from "@/lib/access-control";
import { resolveSubmittedDateRangeFilters } from "@/lib/date-ranges";
import { getShortId, loadManagerRepayments } from "@/lib/manager-operations";
import {
  AccessDenied,
  AutoFilterGrid,
  EmptyState,
  ManagerDetailsLink,
  ManagerRecordHeader,
  ManagerRecordList,
  ManagerRecordRow,
  ManagerShell,
  PersonLabel,
  SelectFilter,
  StatusBadge,
  StatusMessage,
  TextFilter,
  formatCurrency,
  formatDateOnly,
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
  const hasActiveFilters = Object.values(filters).some(Boolean);
  const proofGridClass =
    "sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_0.8fr_0.75fr_5rem] sm:items-center sm:gap-3";

  return (
    <ManagerShell
      title="Repayment proofs"
      description="Monitor submitted evidence, repayment status, and lender review notes."
      activeTab="proofs"
    >
      <AutoFilterGrid>
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
      </AutoFilterGrid>

      {hasActiveFilters ? (
        <Link
          href="/manager/repayments"
          className="w-fit text-xs font-semibold text-[var(--muted-foreground)] transition hover:text-[var(--primary)]"
        >
          Reset filters
        </Link>
      ) : null}

      <StatusMessage message={result.message} tone={result.ok ? "neutral" : "error"} />

      <section>
        {result.proofs.length === 0 ? (
          <EmptyState
            title="No repayment proofs found"
            description="Proofs matching the current filters will appear here."
          />
        ) : null}

        {result.proofs.length > 0 ? (
          <ManagerRecordList>
            <ManagerRecordHeader className={proofGridClass}>
              <span>Proof</span>
              <span>Borrower</span>
              <span>Lender</span>
              <span>Amount</span>
              <span>Status</span>
              <span className="justify-self-end">Details</span>
            </ManagerRecordHeader>

            {result.proofs.map((proof) => (
              <ManagerRecordRow key={proof.id}>
                <article
                  className={`grid gap-2 px-3 py-2.5 sm:grid ${proofGridClass}`}
                >
                  <div className="flex items-start justify-between gap-3 sm:hidden">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold">
                        {proof.fileName}
                      </h2>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Loan {getShortId(proof.activeLoanId)} · installment{" "}
                        {proof.installmentNumber}
                      </p>
                    </div>

                    <ManagerDetailsLink href={`/manager/repayments/${proof.id}`} />
                  </div>

                  <p className="truncate text-xs text-[var(--muted-foreground)] sm:hidden">
                    {proof.borrower.displayName} → {proof.lender.displayName}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:hidden">
                    <span className="text-sm font-semibold">
                      {formatCurrency(proof.amountDue)}
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      Due {formatDateOnly(proof.dueDate)}
                    </span>
                    <StatusBadge status={proof.proofStatus} />
                  </div>

                  <div className="hidden min-w-0 sm:block">
                    <h2 className="truncate text-sm font-semibold">
                      {proof.fileName}
                    </h2>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Loan {getShortId(proof.activeLoanId)} · installment{" "}
                      {proof.installmentNumber}
                    </p>
                  </div>

                  <div className="hidden min-w-0 text-xs sm:block sm:text-sm">
                    <PersonLabel person={proof.borrower} />
                  </div>

                  <div className="hidden min-w-0 text-xs sm:block sm:text-sm">
                    <PersonLabel person={proof.lender} />
                  </div>

                  <div className="hidden text-sm font-semibold sm:block">
                    {formatCurrency(proof.amountDue)}
                    <span className="block text-xs font-normal text-[var(--muted-foreground)]">
                      Due {formatDateOnly(proof.dueDate)}
                    </span>
                  </div>

                  <div className="hidden items-center sm:flex">
                    <StatusBadge status={proof.proofStatus} />
                  </div>

                  <span className="hidden sm:inline-flex sm:justify-self-end">
                    <ManagerDetailsLink href={`/manager/repayments/${proof.id}`} />
                  </span>
                </article>
              </ManagerRecordRow>
            ))}
          </ManagerRecordList>
        ) : null}
      </section>
    </ManagerShell>
  );
}
