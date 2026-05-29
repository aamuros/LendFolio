import { getManagerAccess } from "../manager-access";
import { loadManagerApplications } from "@/lib/manager-operations";
import { RefreshCw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      showHeading={false}
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Applications & offers
          </h1>
          <p className="text-sm text-muted-foreground">
            Track borrower requests, preferred terms, offer counts, and accepted
            terms.
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
