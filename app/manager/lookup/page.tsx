import { requireManager } from "@/lib/access-control";
import {
  getShortId,
  loadManagerLookup,
  loadManagerUserDirectory,
  managerPreferredTermLabels,
} from "@/lib/manager-operations";
import {
  AccessDenied,
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
} from "../manager-ui";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ q?: string; role?: string; status?: string }>;
};

export default async function ManagerLookupPage({ searchParams }: PageProps) {
  const filters = await searchParams;
  const { q } = filters;
  const access = await requireManager();

  if (!access.ok) {
    return (
      <ManagerShell
        title="Lookup"
        description="Search borrower portfolios, applications, offers, loans, and repayment schedules."
        activeTab="lookup"
      >
        <AccessDenied message={access.message} />
      </ManagerShell>
    );
  }

  const [directoryResult, borrowerLookupResult] = await Promise.all([
    loadManagerUserDirectory(access.supabase, filters),
    loadManagerLookup(access.supabase, q),
  ]);

  return (
    <ManagerShell
      title="Lookup"
      description="Review users and find borrower records by name, ID, business location, application ID, or loan purpose."
      activeTab="lookup"
    >
      <FilterGrid>
        <TextFilter label="Search users" name="q" defaultValue={q} />
        <SelectFilter
          label="Role"
          name="role"
          defaultValue={filters.role}
          emptyLabel="All roles"
          options={[
            { value: "borrower", label: "Borrower" },
            { value: "lender", label: "Lender" },
            { value: "manager", label: "Manager" },
          ]}
        />
        <SelectFilter
          label="Status"
          name="status"
          defaultValue={filters.status}
          emptyLabel="Any status"
          options={[
            { value: "active", label: "Active" },
            { value: "pending", label: "Pending" },
            { value: "suspended", label: "Suspended" },
          ]}
        />
      </FilterGrid>

      <StatusMessage
        message={directoryResult.message}
        tone={directoryResult.ok ? "neutral" : "error"}
      />

      <section className="grid gap-2">
        {directoryResult.users.length === 0 ? (
          <EmptyState
            title="No users found"
            description="Users matching the current filters will appear here."
          />
        ) : null}

        {directoryResult.users.length > 0 ? (
          <div className="hidden rounded-t-2xl border border-[var(--border)] bg-[var(--muted)]/40 px-3 py-2 text-xs font-semibold text-[var(--muted-foreground)] sm:grid sm:grid-cols-[minmax(0,1.5fr)_0.8fr_1fr_minmax(0,1.2fr)_auto] sm:gap-3">
            <span>User</span>
            <span>Role</span>
            <span>Status</span>
            <span>Summary</span>
            <span className="text-right">Details</span>
          </div>
        ) : null}

        {directoryResult.users.map((user) => (
          <details
            key={user.profile.id}
            className="group rounded-2xl border border-[var(--border)] bg-white shadow-sm [&>summary::-webkit-details-marker]:hidden"
          >
            <summary className="grid cursor-pointer list-none gap-2 px-3 py-3 text-sm transition hover:bg-[var(--muted)]/20 sm:grid-cols-[minmax(0,1.5fr)_0.8fr_1fr_minmax(0,1.2fr)_auto] sm:items-center sm:gap-3">
              <div className="min-w-0 font-semibold">
                <PersonLabel person={user.profile} />
              </div>
              <span className="inline-flex w-fit rounded-full bg-[var(--muted)] px-3 py-1 text-xs font-semibold capitalize text-[var(--muted-foreground)]">
                {user.role}
              </span>
              <StatusBadge status={user.status} />
              <div className="text-xs leading-5 text-[var(--muted-foreground)]">
                {user.role === "borrower"
                  ? `${user.applicationCount} applications · ${user.activeLoanCount} active loans`
                  : null}
                {user.role === "lender"
                  ? `${user.offerCount} offers · ${user.submittedProofCount} proofs awaiting review`
                  : null}
                {user.role === "manager" ? getShortId(user.profile.id) : null}
              </div>
              <span className="inline-flex h-8 items-center justify-center rounded-full border border-[var(--border)] px-3 text-xs font-semibold text-[var(--foreground)] transition group-open:border-[var(--primary)] group-open:text-[var(--primary)]">
                <span className="group-open:hidden">View details</span>
                <span className="hidden group-open:inline">Hide details</span>
              </span>
            </summary>

            <div className="border-t border-[var(--border)] px-3 py-3">
              {user.role === "borrower" ? (
                <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                  <Field
                    label="Portfolio location"
                    value={user.portfolioLocation ?? "Not provided"}
                  />
                  <Field
                    label="Applications"
                    value={user.applicationCount.toString()}
                  />
                  <Field
                    label="Active loans"
                    value={user.activeLoanCount.toString()}
                  />
                  <Field
                    label="Latest application"
                    value={
                      user.latestApplicationStatus ? (
                        <StatusBadge status={user.latestApplicationStatus} />
                      ) : (
                        "None"
                      )
                    }
                  />
                </dl>
              ) : null}

              {user.role === "lender" ? (
                <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                  <Field
                    label="Organization"
                    value={user.organizationName ?? "Not provided"}
                  />
                  <Field
                    label="Verification"
                    value={
                      user.verificationStatus ? (
                        <StatusBadge status={user.verificationStatus} />
                      ) : (
                        "Not provided"
                      )
                    }
                  />
                  <Field label="Offers" value={user.offerCount.toString()} />
                  <Field
                    label="Accepted offers"
                    value={user.acceptedOfferCount.toString()}
                  />
                  <Field
                    label="Active loans"
                    value={user.activeLoanCount.toString()}
                  />
                  <Field
                    label="Proofs awaiting review"
                    value={user.submittedProofCount.toString()}
                  />
                </dl>
              ) : null}

              {user.role === "manager" ? (
                <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                  <Field label="Profile name" value={user.profile.displayName} />
                  <Field label="Status" value={<StatusBadge status={user.status} />} />
                  <Field label="Short ID" value={getShortId(user.profile.id)} />
                </dl>
              ) : null}
            </div>
          </details>
        ))}
      </section>

      {q ? (
        <StatusMessage
          message={borrowerLookupResult.message}
          tone={borrowerLookupResult.ok ? "neutral" : "error"}
        />
      ) : null}

      {q ? (
        <section className="grid gap-2">
          {borrowerLookupResult.results.length === 0 ? (
            <EmptyState
              title="No borrower records found"
              description="Matching borrower portfolios, applications, and loans will appear here."
            />
          ) : null}

          {borrowerLookupResult.results.length > 0 ? (
            <div className="hidden rounded-t-2xl border border-[var(--border)] bg-[var(--muted)]/40 px-3 py-2 text-xs font-semibold text-[var(--muted-foreground)] sm:grid sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_0.8fr_minmax(0,1fr)_auto] sm:gap-3">
              <span>Borrower</span>
              <span>Location</span>
              <span>Applications</span>
              <span>Latest record</span>
              <span className="text-right">Details</span>
            </div>
          ) : null}

          {borrowerLookupResult.results.map((resultItem) => (
          <details
            key={resultItem.borrower.id}
            className="group rounded-2xl border border-[var(--border)] bg-white shadow-sm [&>summary::-webkit-details-marker]:hidden"
          >
            <summary className="grid cursor-pointer list-none gap-2 px-3 py-3 text-sm transition hover:bg-[var(--muted)]/20 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_0.8fr_minmax(0,1fr)_auto] sm:items-center sm:gap-3">
              <div className="min-w-0 font-semibold">
                <PersonLabel person={resultItem.borrower} />
              </div>
              <p className="truncate text-xs text-[var(--muted-foreground)] sm:text-sm">
                {resultItem.portfolio?.location ?? "No portfolio location"}
              </p>
              <p className="text-sm font-semibold">
                {resultItem.applications.length}
              </p>
              <div className="flex min-w-0 flex-wrap gap-1.5 text-xs text-[var(--muted-foreground)]">
                {resultItem.applications[0] ? (
                  <>
                    <StatusBadge status={resultItem.applications[0].status} />
                    <span className="truncate">
                      {getShortId(resultItem.applications[0].id)}
                    </span>
                  </>
                ) : (
                  "No applications"
                )}
              </div>
              <span className="inline-flex h-8 items-center justify-center rounded-full border border-[var(--border)] px-3 text-xs font-semibold text-[var(--foreground)] transition group-open:border-[var(--primary)] group-open:text-[var(--primary)]">
                <span className="group-open:hidden">View details</span>
                <span className="hidden group-open:inline">Hide details</span>
              </span>
            </summary>

            <div className="grid gap-3 border-t border-[var(--border)] px-3 py-3">
              {resultItem.portfolio ? (
                <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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

              <div className="grid gap-2">
                {resultItem.applications.length === 0 ? (
                  <p className="text-sm text-[var(--muted-foreground)]">
                    No applications found for this borrower.
                  </p>
                ) : null}

                {resultItem.applications.map((application) => (
                  <div
                    key={application.id}
                    className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/20 px-3 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold">
                          Application {getShortId(application.id)}
                        </h3>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {application.purpose}
                        </p>
                      </div>
                      <StatusBadge status={application.status} />
                    </div>
                    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
            </div>
          </details>
          ))}
        </section>
      ) : null}
    </ManagerShell>
  );
}
