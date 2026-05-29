import { getManagerAccess } from "../manager-access";
import { loadManagerLoans } from "@/lib/manager-operations";
import { RefreshCw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      showHeading={false}
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Active loans
          </h1>
          <p className="text-sm text-muted-foreground">
            Review funded loans by status, borrower, lender, balance, and due
            date.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Download className="size-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <LoanSummaryCards loans={result.loans} />

        <LoanFilters
          filters={filters}
          hasActiveFilters={hasActiveFilters}
        />

        <StatusMessage
          message={result.message}
          tone={result.ok ? "neutral" : "error"}
        />

        <LoansTable
          loans={result.loans}
          hasActiveFilters={hasActiveFilters}
        />
      </div>
    </ManagerShell>
  );
}
