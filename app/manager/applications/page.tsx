import { requireManager } from "@/lib/access-control";
import {
  getShortId,
  loadManagerApplications,
  managerPreferredTermLabels,
} from "@/lib/manager-operations";
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
  formatDateTime,
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
        activeTab={null}
      >
        <AccessDenied message={access.message} />
      </ManagerShell>
    );
  }

  const result = await loadManagerApplications(access.supabase, filters);

  return (
    <ManagerShell
      title="Applications & offers"
      description="Track borrower requests, preferred terms, offer counts, and accepted terms."
      activeTab={null}
    >
      <FilterGrid>
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
      </FilterGrid>

      <StatusMessage message={result.message} tone={result.ok ? "neutral" : "error"} />

      <section className="grid gap-3">
        {result.applications.length === 0 ? (
          <EmptyState
            title="No applications found"
            description="Applications matching the current filters will appear here."
          />
        ) : null}

        {result.applications.map((application) => (
          <DataCard key={application.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  Application {getShortId(application.id)}
                </h2>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {application.purpose}
                </p>
              </div>
              <StatusBadge status={application.status} />
            </div>
            <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Field
                label="Borrower"
                value={<PersonLabel person={application.borrower} />}
              />
              <Field
                label="Requested amount"
                value={formatCurrency(application.requestedAmount)}
              />
              <Field
                label="Preferred term"
                value={managerPreferredTermLabels[application.preferredTerm]}
              />
              <Field
                label="Submitted"
                value={formatDateTime(application.submittedAt)}
              />
              <Field
                label="Readiness"
                value={
                  application.creditReadinessStatus?.replaceAll("_", " ") ??
                  "Not recorded"
                }
              />
              <Field
                label="Risk flags"
                value={
                  application.riskFlags.length
                    ? application.riskFlags
                        .map((flag) => flag.replaceAll("_", " "))
                        .join(", ")
                    : "None"
                }
              />
              <Field
                label="Offers"
                value={`${application.offerCounts.pending} pending, ${application.offerCounts.accepted} accepted, ${application.offerCounts.declined} declined, ${application.offerCounts.expired} expired`}
              />
              <Field
                label="Accepted offer"
                value={
                  application.acceptedOffer
                    ? `${application.acceptedOffer.lenderName} · ${formatCurrency(
                        application.acceptedOffer.repaymentAmount,
                      )} due ${formatDateOnly(application.acceptedOffer.dueDate)}`
                    : "None"
                }
              />
            </dl>
          </DataCard>
        ))}
      </section>
    </ManagerShell>
  );
}
