import { requireManager } from "@/lib/access-control";
import { resolveSubmittedDateRangeFilters } from "@/lib/date-ranges";
import { getShortId, loadManagerRepayments } from "@/lib/manager-operations";
import {
  AccessDenied,
  DataCard,
  EmptyState,
  Field,
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

      <section className="grid gap-3">
        {result.proofs.length === 0 ? (
          <EmptyState
            title="No repayment proofs found"
            description="Proofs matching the current filters will appear here."
          />
        ) : null}

        {result.proofs.map((proof) => (
          <DataCard key={proof.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold break-all">{proof.fileName}</h2>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Loan {getShortId(proof.activeLoanId)} · installment{" "}
                  {proof.installmentNumber}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={proof.proofStatus} />
                <StatusBadge status={proof.repaymentStatus} />
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Field label="Borrower" value={<PersonLabel person={proof.borrower} />} />
              <Field label="Lender" value={<PersonLabel person={proof.lender} />} />
              <Field label="Amount due" value={formatCurrency(proof.amountDue)} />
              <Field label="Due date" value={formatDateOnly(proof.dueDate)} />
              <Field label="Submitted" value={formatDateTime(proof.submittedAt)} />
              <Field label="Reviewed" value={formatDateTime(proof.reviewedAt)} />
              <Field label="Review notes" value={proof.reviewNotes ?? "No notes"} />
            </dl>
          </DataCard>
        ))}
      </section>
    </ManagerShell>
  );
}
