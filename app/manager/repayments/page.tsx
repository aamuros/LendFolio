import { getManagerAccess } from "../manager-access";
import { resolveSubmittedDateRangeFilters } from "@/lib/date-ranges";
import { loadManagerRepayments } from "@/lib/manager-operations";
import {
  AccessDenied,
  ManagerShell,
  StatusMessage,
} from "../manager-ui";
import { refreshOverdueStatusesAction } from "../actions";
import { RepaymentSummaryCards } from "@/components/manager/repayments/repayment-summary-cards";
import { RepaymentFilters } from "@/components/manager/repayments/repayment-filters";
import { RepaymentProofsTable } from "@/components/manager/repayments/repayment-proofs-table";
import { RefreshOverdueButton } from "@/components/manager/repayments/refresh-overdue-button";
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
    overdueRefresh?: string;
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
  const hasActiveFilters = Object.values(filters).some((v) => typeof v === "string" && Boolean(v));
  const overdueRefreshMessage =
    filters.overdueRefresh === "success"
      ? "Overdue repayment statuses refreshed."
      : filters.overdueRefresh === "error"
        ? "Could not refresh overdue statuses."
        : null;

  return (
    <ManagerShell
      title="Repayment proofs"
      description="Monitor submitted payment evidence, review status, due dates, and lender decisions."
      headerActions={
        <form action={refreshOverdueStatusesAction}>
          <input type="hidden" name="returnPath" value="/manager/repayments" />
          <RefreshOverdueButton />
        </form>
      }
    >
      <div className="flex flex-col gap-6">
        {overdueRefreshMessage ? (
          <StatusMessage
            message={overdueRefreshMessage}
            tone={filters.overdueRefresh === "error" ? "error" : "neutral"}
          />
        ) : null}

        <RepaymentSummaryCards proofs={result.ok ? result.proofs : []} />

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
