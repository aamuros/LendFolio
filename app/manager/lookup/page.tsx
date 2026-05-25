import { requireManager } from "@/lib/access-control";
import {
  getShortId,
  loadManagerLookup,
  managerPreferredTermLabels,
} from "@/lib/manager-operations";
import {
  AccessDenied,
  DataCard,
  Field,
  ManagerShell,
  PersonLabel,
  StatusBadge,
  StatusMessage,
  TextFilter,
  formatCurrency,
  formatDateOnly,
} from "../manager-ui";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function ManagerLookupPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const access = await requireManager();

  if (!access.ok) {
    return (
      <ManagerShell
        title="Lookup"
        description="Search borrower portfolios, applications, offers, loans, and repayment schedules."
      >
        <AccessDenied message={access.message} />
      </ManagerShell>
    );
  }

  const result = await loadManagerLookup(access.supabase, q);

  return (
    <ManagerShell
      title="Lookup"
      description="Find records by borrower name or ID, application ID, business location, or loan purpose."
    >
      <form className="grid gap-3 rounded-md border border-[var(--border)] bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto]">
        <TextFilter label="Search" name="q" defaultValue={q} />
        <div className="flex items-end">
          <button
            type="submit"
            className="h-10 rounded-full bg-[var(--primary)] px-5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
          >
            Search
          </button>
        </div>
      </form>

      <StatusMessage message={result.message} tone={result.ok ? "neutral" : "error"} />

      <section className="grid gap-3">
        {result.results.map((resultItem) => (
          <DataCard key={resultItem.borrower.id}>
            <div className="grid gap-1">
              <h2 className="text-lg font-semibold">
                <PersonLabel person={resultItem.borrower} />
              </h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                {resultItem.portfolio?.location ?? "No portfolio location"}
              </p>
            </div>

            {resultItem.portfolio ? (
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Business location" value={resultItem.portfolio.location} />
                <Field
                  label="Monthly gross revenue"
                  value={formatCurrency(resultItem.portfolio.monthly_gross_revenue)}
                />
                <Field
                  label="Monthly expenses"
                  value={formatCurrency(resultItem.portfolio.monthly_expenses)}
                />
                <Field
                  label="Loan context"
                  value={resultItem.portfolio.loan_purpose_context}
                />
              </dl>
            ) : null}

            <div className="grid gap-3">
              {resultItem.applications.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">
                  No applications found for this borrower.
                </p>
              ) : null}

              {resultItem.applications.map((application) => (
                <div
                  key={application.id}
                  className="grid gap-3 border-t border-[var(--border)] pt-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">
                        Application {getShortId(application.id)}
                      </h3>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {application.purpose}
                      </p>
                    </div>
                    <StatusBadge status={application.status} />
                  </div>
                  <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Field
                      label="Requested amount"
                      value={formatCurrency(application.requestedAmount)}
                    />
                    <Field
                      label="Preferred term"
                      value={managerPreferredTermLabels[application.preferredTerm]}
                    />
                    <Field
                      label="Offer count"
                      value={application.offers.length.toString()}
                    />
                    <Field
                      label="Active loan"
                      value={
                        application.activeLoan ? (
                          <>
                            <StatusBadge status={application.activeLoan.status} />{" "}
                            {formatCurrency(application.activeLoan.outstandingBalance)}{" "}
                            outstanding
                          </>
                        ) : (
                          "None"
                        )
                      }
                    />
                    <Field
                      label="Repayment schedule"
                      value={
                        application.activeLoan
                          ? `${application.activeLoan.schedule.verifiedCount}/${application.activeLoan.schedule.installmentCount} verified, next due ${formatDateOnly(
                              application.activeLoan.schedule.nextDueDate,
                            )}`
                          : "None"
                      }
                    />
                  </dl>
                </div>
              ))}
            </div>
          </DataCard>
        ))}
      </section>
    </ManagerShell>
  );
}
