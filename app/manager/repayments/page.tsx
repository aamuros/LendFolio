import Link from "next/link";
import { getManagerAccess } from "../manager-access";
import { resolveSubmittedDateRangeFilters } from "@/lib/date-ranges";
import { loadManagerRepayments } from "@/lib/manager-operations";
import {
  AccessDenied,
  ManagerShell,
  StatusMessage,
} from "../manager-ui";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon, DownloadIcon } from "lucide-react";
import { RepaymentSummaryCards } from "@/components/manager/repayments/repayment-summary-cards";
import { RepaymentFilters } from "@/components/manager/repayments/repayment-filters";
import { RepaymentProofsTable } from "@/components/manager/repayments/repayment-proofs-table";
import { withServerTiming } from "@/lib/perf";



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
  const access = await getManagerAccess();

  if (!access.ok) {
    return (
      <ManagerShell
        title="Repayment proofs"
        description="Monitor submitted payment evidence, review status, due dates, and lender decisions."
      >
        <AccessDenied message={access.message} />
      </ManagerShell>
    );
  }

  const submittedDateFilters = resolveSubmittedDateRangeFilters(filters);
  const { result } = await withServerTiming(
    "loadManagerRepayments",
    () => loadManagerRepayments(access.supabase, {
      ...filters,
      ...submittedDateFilters,
    }),
  );
  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <ManagerShell
      title="Repayment proofs"
      description="Monitor submitted payment evidence, review status, due dates, and lender decisions."
      showHeading={false}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Repayment proofs
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitor submitted payment evidence, review status, due dates, and
              lender decisions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/manager/repayments">
                <RefreshCwIcon />
                Refresh
              </Link>
            </Button>
            <Button variant="outline" size="sm" disabled>
              <DownloadIcon />
              Export CSV
            </Button>
          </div>
        </div>

        <RepaymentSummaryCards />

        <RepaymentFilters
          filters={filters}
          hasActiveFilters={hasActiveFilters}
        />

        {!result.ok ? (
          <StatusMessage message={result.message} tone="error" />
        ) : null}

        <RepaymentProofsTable
          proofs={result.proofs}
          hasActiveFilters={hasActiveFilters}
        />
      </div>
    </ManagerShell>
  );
}
