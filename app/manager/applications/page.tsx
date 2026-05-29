import { requireManager } from "@/lib/access-control";
import Link from "next/link";
import {
  getShortId,
  loadManagerApplications,
  managerPreferredTermLabels,
} from "@/lib/manager-operations";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AccessDenied,
  AutoFilterGrid,
  EmptyState,
  ManagerDetailsLink,
  ManagerShell,
  PersonLabel,
  SelectFilter,
  StatusBadge,
  StatusMessage,
  TextFilter,
  formatCurrency,
} from "../manager-ui";

export const dynamic = "force-dynamic";

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
  const access = await requireManager();

  if (!access.ok) {
    return (
      <ManagerShell
        title="Applications & offers"
        description="Read-only application and offer lifecycle visibility."
      >
        <AccessDenied message={access.message} />
      </ManagerShell>
    );
  }

  const result = await loadManagerApplications(access.supabase, filters);
  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <ManagerShell
      title="Applications & offers"
      description="Track borrower requests, preferred terms, offer counts, and accepted terms."
    >
      <AutoFilterGrid>
        <SelectFilter
          label="Application status"
          name="status"
          defaultValue={filters.status}
          options={[
            { value: "submitted", label: "Submitted" },
            { value: "open", label: "Open" },
            { value: "accepted", label: "Accepted" },
            { value: "declined", label: "Declined" },
            { value: "withdrawn", label: "Withdrawn" },
          ]}
        />
        <TextFilter
          label="Borrower"
          name="borrower"
          defaultValue={filters.borrower}
        />
        <SelectFilter
          label="Preferred term"
          name="preferredTerm"
          defaultValue={filters.preferredTerm}
          options={[
            { value: "1_month", label: "1 month" },
            { value: "3_months", label: "3 months" },
            { value: "6_months", label: "6 months" },
            { value: "12_months", label: "12 months" },
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
          href="/manager/applications"
          className="w-fit text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          Reset filters
        </Link>
      ) : null}

      <StatusMessage message={result.message} tone={result.ok ? "neutral" : "error"} />

      <section>
        {result.applications.length === 0 ? (
          <EmptyState
            title="No applications found"
            description="Applications matching the current filters will appear here."
          />
        ) : null}

        {result.applications.length > 0 ? (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Application</TableHead>
                    <TableHead>Borrower</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.applications.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            Application {getShortId(application.id)}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {application.purpose}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <PersonLabel person={application.borrower} />
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(application.requestedAmount)}
                      </TableCell>
                      <TableCell>
                        {managerPreferredTermLabels[application.preferredTerm]}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={application.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <ManagerDetailsLink
                          href={`/manager/applications/${application.id}`}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-3 md:hidden">
              {result.applications.map((application) => (
                <article
                  key={application.id}
                  className="grid gap-2 rounded-lg border bg-card p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="truncate text-sm font-semibold">
                      Application {getShortId(application.id)}
                    </h2>
                    <ManagerDetailsLink
                      href={`/manager/applications/${application.id}`}
                    />
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {application.purpose}
                  </p>
                  <p className="text-xs">
                    <PersonLabel person={application.borrower} />
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-sm font-semibold">
                      {formatCurrency(application.requestedAmount)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {managerPreferredTermLabels[application.preferredTerm]}
                    </span>
                    <StatusBadge status={application.status} />
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </section>
    </ManagerShell>
  );
}
