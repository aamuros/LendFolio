import { getManagerAccess } from "../manager-access";
import { loadManagerApplications } from "@/lib/manager-operations";
import {
  AccessDenied,
  ManagerShell,
  StatusMessage,
} from "../manager-ui";
import { ApplicationSummaryCards } from "@/components/manager/applications/application-summary-cards";
import { ApplicationFilters } from "@/components/manager/applications/application-filters";
import { ApplicationsTable } from "@/components/manager/applications/applications-table";
import { withServerTiming } from "@/lib/perf";



type PageProps = {
  searchParams: Promise<{
    status?: string;
    borrower?: string;
    preferredTerm?: string;
    submittedFrom?: string;
    submittedTo?: string;
  }>;
};

export default async function ManagerApplicationsPage({ searchParams }: PageProps) {
  const filters = await searchParams;
  const access = await getManagerAccess();

  if (!access.ok) {
    return (
      <ManagerShell
        title="Applications & offers"
        description="Track borrower requests, preferred terms, offer counts, and accepted terms."
      >
        <AccessDenied message={access.message} />
      </ManagerShell>
    );
  }

  const { result } = await withServerTiming(
    "loadManagerApplications",
    () => loadManagerApplications(access.supabase, filters),
  );
  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <ManagerShell
      title="Applications & offers"
      description="Track borrower requests, preferred terms, offer counts, and accepted terms."
    >
      <div className="space-y-6">
        <ApplicationSummaryCards applications={result.applications} />

        <ApplicationFilters
          filters={filters}
          hasActiveFilters={hasActiveFilters}
        />

        {!result.ok ? (
          <StatusMessage message={result.message} tone="error" />
        ) : null}

        <ApplicationsTable
          applications={result.applications}
          hasActiveFilters={hasActiveFilters}
        />
      </div>
    </ManagerShell>
  );
}
