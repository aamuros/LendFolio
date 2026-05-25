import { requireManager } from "@/lib/access-control";
import {
  getShortId,
  loadManagerLookup,
  loadManagerUserDirectory,
} from "@/lib/manager-operations";
import {
  AccessDenied,
  EmptyState,
  FilterGrid,
  ManagerDetailsLink,
  ManagerRecordHeader,
  ManagerShell,
  RoleBadge,
  SelectFilter,
  StatusBadge,
  StatusMessage,
  TextFilter,
} from "../manager-ui";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ q?: string; role?: string; status?: string }>;
};

function getUserSummary(user: {
  role: string;
  profile: { id: string };
  applicationCount?: number;
  activeLoanCount?: number;
  offerCount?: number;
  submittedProofCount?: number;
}) {
  if (user.role === "borrower") {
    return `${user.applicationCount ?? 0} applications · ${
      user.activeLoanCount ?? 0
    } active loans`;
  }

  if (user.role === "lender") {
    return `${user.offerCount ?? 0} offers · ${
      user.submittedProofCount ?? 0
    } proofs awaiting review`;
  }

  return `Manager · ${getShortId(user.profile.id)}`;
}

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
  const userGridClass =
    "sm:grid-cols-[minmax(0,1.45fr)_0.65fr_0.75fr_minmax(0,1.5fr)_4.5rem] sm:items-center sm:gap-3";
  const borrowerGridClass =
    "sm:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_0.7fr_minmax(0,1fr)_4.5rem] sm:items-center sm:gap-3";

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

      <section>
        {directoryResult.users.length === 0 ? (
          <EmptyState
            title="No users found"
            description="Users matching the current filters will appear here."
          />
        ) : null}

        {directoryResult.users.length > 0 ? (
          <section className="grid gap-3 sm:block sm:overflow-hidden sm:rounded-2xl sm:border sm:border-[var(--border)] sm:bg-white sm:shadow-sm">
            <ManagerRecordHeader className={userGridClass}>
              <span>User</span>
              <span>Role</span>
              <span>Status</span>
              <span>Summary</span>
              <span className="justify-self-end">Details</span>
            </ManagerRecordHeader>

            {directoryResult.users.map((user) => (
              <article
                key={user.profile.id}
                className={`grid gap-2 rounded-2xl border border-[var(--border)] bg-white px-3 py-2.5 shadow-sm sm:rounded-none sm:border-x-0 sm:border-t-0 sm:shadow-none sm:last:border-b-0 sm:grid sm:py-2 ${userGridClass}`}
              >
                <div className="flex items-start justify-between gap-3 sm:hidden">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold">
                      {user.profile.displayName}
                    </h2>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {getShortId(user.profile.id)}
                    </p>
                  </div>
                  <ManagerDetailsLink href={`/manager/users/${user.profile.id}`} />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 sm:hidden">
                  <RoleBadge role={user.role} />
                  <StatusBadge status={user.status} />
                </div>
                <p className="truncate text-xs text-[var(--muted-foreground)] sm:hidden">
                  {getUserSummary(user)}
                </p>

                <div className="hidden min-w-0 sm:block">
                  <p className="truncate text-sm font-semibold">
                    {user.profile.displayName}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {getShortId(user.profile.id)}
                  </p>
                </div>
                <div className="hidden sm:block">
                  <RoleBadge role={user.role} />
                </div>
                <div className="hidden sm:block">
                  <StatusBadge status={user.status} />
                </div>
                <p className="hidden truncate text-xs leading-5 text-[var(--muted-foreground)] sm:block">
                  {getUserSummary(user)}
                </p>
                <div className="hidden sm:block sm:justify-self-end">
                  <ManagerDetailsLink href={`/manager/users/${user.profile.id}`} />
                </div>
              </article>
            ))}
          </section>
        ) : null}
      </section>

      {q ? (
        <StatusMessage
          message={borrowerLookupResult.message}
          tone={borrowerLookupResult.ok ? "neutral" : "error"}
        />
      ) : null}

      {q ? (
        <section>
          {borrowerLookupResult.results.length === 0 ? (
            <EmptyState
              title="No borrower records found"
              description="Matching borrower portfolios, applications, and loans will appear here."
            />
          ) : null}

          {borrowerLookupResult.results.length > 0 ? (
            <section className="grid gap-3 sm:block sm:overflow-hidden sm:rounded-2xl sm:border sm:border-[var(--border)] sm:bg-white sm:shadow-sm">
              <ManagerRecordHeader className={borrowerGridClass}>
                <span>Borrower</span>
                <span>Location</span>
                <span>Applications</span>
                <span>Latest record</span>
                <span className="justify-self-end">Details</span>
              </ManagerRecordHeader>

              {borrowerLookupResult.results.map((resultItem) => (
                <article
                  key={resultItem.borrower.id}
                  className={`grid gap-2 rounded-2xl border border-[var(--border)] bg-white px-3 py-2.5 shadow-sm sm:rounded-none sm:border-x-0 sm:border-t-0 sm:shadow-none sm:last:border-b-0 sm:grid sm:py-2 ${borrowerGridClass}`}
                >
                  <div className="flex items-start justify-between gap-3 sm:hidden">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold">
                        {resultItem.borrower.displayName}
                      </h2>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {getShortId(resultItem.borrower.id)}
                      </p>
                    </div>
                    <ManagerDetailsLink
                      href={`/manager/users/${resultItem.borrower.id}`}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:hidden">
                    <span className="truncate text-xs text-[var(--muted-foreground)]">
                      {resultItem.portfolio?.location ?? "No portfolio location"}
                    </span>
                    <span className="text-xs font-semibold">
                      {resultItem.applications.length} applications
                    </span>
                    {resultItem.applications[0] ? (
                      <StatusBadge status={resultItem.applications[0].status} />
                    ) : null}
                  </div>

                  <div className="hidden min-w-0 sm:block">
                    <p className="truncate text-sm font-semibold">
                      {resultItem.borrower.displayName}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {getShortId(resultItem.borrower.id)}
                    </p>
                  </div>
                  <p className="hidden truncate text-xs text-[var(--muted-foreground)] sm:block">
                    {resultItem.portfolio?.location ?? "No portfolio location"}
                  </p>
                  <p className="hidden text-xs font-semibold sm:block">
                    {resultItem.applications.length}
                  </p>
                  <div className="hidden min-w-0 flex-wrap gap-1.5 text-xs text-[var(--muted-foreground)] sm:flex">
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
                  <div className="hidden sm:block sm:justify-self-end">
                    <ManagerDetailsLink
                      href={`/manager/users/${resultItem.borrower.id}`}
                    />
                  </div>
                </article>
              ))}
            </section>
          ) : null}
        </section>
      ) : null}
    </ManagerShell>
  );
}
