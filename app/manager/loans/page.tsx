import { requireManager } from "@/lib/access-control";
import { getShortId, loadManagerLoans } from "@/lib/manager-operations";
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
} from "../manager-ui";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    status?: string;
    lender?: string;
    borrower?: string;
    dueFrom?: string;
    dueTo?: string;
  }>;
};

export default async function ManagerLoansPage({ searchParams }: PageProps) {
  const filters = await searchParams;
  const access = await requireManager();

  if (!access.ok) {
    return (
      <ManagerShell
        title="Active loans"
        description="Read-only portfolio view for funded loans and repayment schedule progress."
        activeTab="loans"
      >
        <AccessDenied message={access.message} />
      </ManagerShell>
    );
  }

  const result = await loadManagerLoans(access.supabase, filters);

  return (
    <ManagerShell
      title="Active loans"
      description="Review funded loans by status, borrower, lender, and due date."
      activeTab="loans"
    >
      <FilterGrid>
        <SelectFilter
          label="Status"
          name="status"
          defaultValue={filters.status}
          options={[
            { value: "active", label: "Active" },
            { value: "paid", label: "Paid" },
            { value: "overdue", label: "Overdue" },
            { value: "defaulted", label: "Defaulted" },
            { value: "closed", label: "Closed" },
          ]}
        />
        <TextFilter label="Lender" name="lender" defaultValue={filters.lender} />
        <TextFilter
          label="Borrower"
          name="borrower"
          defaultValue={filters.borrower}
        />
        <TextFilter
          label="Due date from"
          name="dueFrom"
          type="date"
          defaultValue={filters.dueFrom}
        />
        <TextFilter
          label="Due date to"
          name="dueTo"
          type="date"
          defaultValue={filters.dueTo}
        />
      </FilterGrid>

      <StatusMessage message={result.message} tone={result.ok ? "neutral" : "error"} />

      <section className="grid gap-3">
        {result.loans.length === 0 ? (
          <EmptyState
            title="No active loans found"
            description="Loans matching the current filters will appear here."
          />
        ) : null}

        {result.loans.map((loan) => (
          <DataCard key={loan.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Loan {getShortId(loan.id)}</h2>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Due {formatDateOnly(loan.dueDate)}
                </p>
              </div>
              <StatusBadge status={loan.status} />
            </div>
            <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Field label="Borrower" value={<PersonLabel person={loan.borrower} />} />
              <Field label="Lender" value={<PersonLabel person={loan.lender} />} />
              <Field label="Principal" value={formatCurrency(loan.principalAmount)} />
              <Field label="Repayment amount" value={formatCurrency(loan.repaymentAmount)} />
              <Field
                label="Outstanding balance"
                value={formatCurrency(loan.outstandingBalance)}
              />
              <Field label="Started" value={formatDateOnly(loan.startedAt)} />
              <Field label="Due date" value={formatDateOnly(loan.dueDate)} />
              <Field
                label="Repayment schedule"
                value={`${loan.schedule.verifiedCount}/${loan.schedule.installmentCount} verified`}
              />
              <Field
                label="Next due"
                value={formatDateOnly(loan.schedule.nextDueDate)}
              />
              <Field
                label="Proof state"
                value={`${loan.schedule.submittedCount} submitted, ${loan.schedule.rejectedCount} rejected`}
              />
            </dl>
          </DataCard>
        ))}
      </section>
    </ManagerShell>
  );
}
