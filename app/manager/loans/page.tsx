import Link from "next/link";
import { requireManager } from "@/lib/access-control";
import { getShortId, loadManagerLoans } from "@/lib/manager-operations";
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
  const hasActiveFilters = Object.values(filters).some(Boolean);
  const loanGridClass =
    "sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_0.85fr_0.85fr_0.75fr_5rem] sm:items-center sm:gap-3";

  return (
    <ManagerShell
      title="Active loans"
      description="Review funded loans by status, borrower, lender, and due date."
      activeTab="loans"
    >
      <AutoFilterGrid>
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
      </AutoFilterGrid>

      {hasActiveFilters ? (
        <Link
          href="/manager/loans"
          className="w-fit text-xs font-semibold text-[var(--muted-foreground)] transition hover:text-[var(--primary)]"
        >
          Reset filters
        </Link>
      ) : null}

      <StatusMessage message={result.message} tone={result.ok ? "neutral" : "error"} />

      <section>
        {result.loans.length === 0 ? (
          <EmptyState
            title="No active loans found"
            description="Loans matching the current filters will appear here."
          />
        ) : null}

        {result.loans.length > 0 ? (
          <ManagerRecordList>
            <ManagerRecordHeader className={loanGridClass}>
              <span>Loan</span>
              <span>Borrower</span>
              <span>Lender</span>
              <span>Outstanding</span>
              <span>Due</span>
              <span>Status</span>
              <span className="justify-self-center">Details</span>
            </ManagerRecordHeader>

            {result.loans.map((loan) => (
              <ManagerRecordRow key={loan.id}>
                <article
                  className={`grid gap-2 px-3 py-2.5 sm:grid ${loanGridClass}`}
                >
                  <div className="flex items-start justify-between gap-3 sm:hidden">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold">
                        Loan {getShortId(loan.id)}
                      </h2>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Due {formatDateOnly(loan.dueDate)}
                      </p>
                    </div>
                    <ManagerDetailsLink href={`/manager/loans/${loan.id}`} />
                  </div>

                  <p className="truncate text-xs text-[var(--muted-foreground)] sm:hidden">
                    {loan.borrower.displayName} &rarr; {loan.lender.displayName}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:hidden">
                    <span className="text-sm font-semibold">
                      {formatCurrency(loan.outstandingBalance)}
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      Due {formatDateOnly(loan.dueDate)}
                    </span>
                    <StatusBadge status={loan.status} />
                  </div>

                  <div className="hidden min-w-0 sm:block">
                    <h2 className="truncate text-sm font-semibold">
                      Loan {getShortId(loan.id)}
                    </h2>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {loan.schedule.verifiedCount}/
                      {loan.schedule.installmentCount} verified
                    </p>
                  </div>

                  <div className="hidden min-w-0 text-xs sm:block sm:text-sm">
                    <PersonLabel person={loan.borrower} />
                  </div>

                  <div className="hidden min-w-0 text-xs sm:block sm:text-sm">
                    <PersonLabel person={loan.lender} />
                  </div>

                  <p className="hidden text-sm font-semibold sm:block">
                    {formatCurrency(loan.outstandingBalance)}
                  </p>

                  <p className="hidden text-sm sm:block">
                    {formatDateOnly(loan.dueDate)}
                  </p>

                  <div className="hidden items-center sm:flex">
                    <StatusBadge status={loan.status} />
                  </div>

                  <span className="hidden sm:inline-flex sm:justify-self-center">
                    <ManagerDetailsLink href={`/manager/loans/${loan.id}`} />
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
