import { getManagerAccess } from "../manager-access";
import { loadManagerLoans } from "@/lib/manager-operations";
import {
  AccessDenied,
  ManagerShell,
  StatusMessage,
} from "../manager-ui";
import { LoanSummaryCards } from "@/components/manager/loans/loan-summary-cards";
import { LoanFilters } from "@/components/manager/loans/loan-filters";
import { LoansTable } from "@/components/manager/loans/loans-table";
import { withServerTiming } from "@/lib/perf";



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
  const access = await getManagerAccess();

  if (!access.ok) {
    return (
      <ManagerShell
        title="Active loans"
        description="Read-only portfolio view for funded loans and repayment schedule progress."
      >
        <AccessDenied message={access.message} />
      </ManagerShell>
    );
  }

  const { result } = await withServerTiming(
    "loadManagerLoans",
    () => loadManagerLoans(access.supabase, filters),
  );
  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <ManagerShell
      title="Active loans"
      description="Review funded loans by status, borrower, lender, balance, and due date."
    >
      <div className="space-y-6">
        <LoanSummaryCards loans={result.loans} />

        <LoanFilters
          filters={filters}
          hasActiveFilters={hasActiveFilters}
        />

        {!result.ok ? (
          <StatusMessage message={result.message} tone="error" />
        ) : null}

        <LoansTable
          loans={result.loans}
          hasActiveFilters={hasActiveFilters}
        />
      </div>
    </ManagerShell>
  );
}
