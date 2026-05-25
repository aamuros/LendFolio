import { requireManager } from "@/lib/access-control";
import Link from "next/link";
import {
  getShortId,
  loadManagerApplications,
  managerPreferredTermLabels,
} from "@/lib/manager-operations";
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
        activeTab="applications"
      >
        <AccessDenied message={access.message} />
      </ManagerShell>
    );
  }

  const result = await loadManagerApplications(access.supabase, filters);
  const hasActiveFilters = Object.values(filters).some(Boolean);
  const applicationGridClass =
    "sm:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_0.85fr_0.8fr_0.8fr_4.5rem] sm:items-center sm:gap-3";

  return (
    <ManagerShell
      title="Applications & offers"
      description="Track borrower requests, preferred terms, offer counts, and accepted terms."
      activeTab="applications"
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
          className="w-fit text-xs font-semibold text-[var(--muted-foreground)] transition hover:text-[var(--primary)]"
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
          <ManagerRecordList>
            <ManagerRecordHeader className={applicationGridClass}>
              <span>Application</span>
              <span>Borrower</span>
              <span>Requested</span>
              <span>Term</span>
              <span>Status</span>
              <span className="justify-self-center">Details</span>
            </ManagerRecordHeader>

            {result.applications.map((application) => (
              <ManagerRecordRow key={application.id}>
                <article
                  className={`grid gap-2 px-3 py-2.5 sm:grid ${applicationGridClass}`}
                >
                  <div className="flex items-start justify-between gap-3 sm:hidden">
                    <h2 className="truncate text-sm font-semibold">
                      Application {getShortId(application.id)}
                    </h2>
                    <ManagerDetailsLink
                      href={`/manager/applications/${application.id}`}
                    />
                  </div>

                  <p className="truncate text-sm text-[var(--muted-foreground)] sm:hidden">
                    {application.purpose}
                  </p>

                  <p className="text-xs sm:hidden">
                    <PersonLabel person={application.borrower} />
                  </p>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:hidden">
                    <span className="text-sm font-semibold">
                      {formatCurrency(application.requestedAmount)}
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {managerPreferredTermLabels[application.preferredTerm]}
                    </span>
                    <StatusBadge status={application.status} />
                  </div>

                  <div className="hidden min-w-0 sm:block">
                    <h2 className="truncate text-sm font-semibold">
                      Application {getShortId(application.id)}
                    </h2>
                    <p className="truncate text-xs text-[var(--muted-foreground)]">
                      {application.purpose}
                    </p>
                  </div>

                  <div className="hidden min-w-0 text-xs sm:block sm:text-sm">
                    <PersonLabel person={application.borrower} />
                  </div>

                  <p className="hidden text-sm font-semibold sm:block">
                    {formatCurrency(application.requestedAmount)}
                  </p>

                  <p className="hidden text-sm sm:block">
                    {managerPreferredTermLabels[application.preferredTerm]}
                  </p>

                  <div className="hidden items-center sm:flex">
                    <StatusBadge status={application.status} />
                  </div>

                  <span className="hidden sm:inline-flex sm:justify-self-center">
                    <ManagerDetailsLink
                      href={`/manager/applications/${application.id}`}
                    />
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
