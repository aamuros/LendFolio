import { getManagerAccess } from "../manager-access";
import {
  getShortId,
  loadManagerLookup,
  loadManagerUserDirectory,
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
  ListTable,
  ManagerDetailsLink,
  ManagerShell,
  MobileCard,
  ResetFiltersLink,
  RoleBadge,
  SelectFilter,
  StatusBadge,
  StatusMessage,
  TextFilter,
} from "../manager-ui";



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

function getManagerUserHref(id: string) {
  return `/manager/users/${id}`;
}

export default async function ManagerLookupPage({ searchParams }: PageProps) {
  const filters = await searchParams;
  const { q } = filters;
  const access = await getManagerAccess();

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

  const [directoryResult, borrowerLookupResult] = await Promise.all([
    loadManagerUserDirectory(access.supabase, filters),
    loadManagerLookup(access.supabase, q),
  ]);
  const hasActiveFilters = Boolean(q || filters.role || filters.status);

  return (
    <ManagerShell
      title="Lookup"
      description="Review users and find borrower records by name, ID, business location, application ID, or loan purpose."
    >
      <AutoFilterGrid>
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
      </AutoFilterGrid>

      {hasActiveFilters ? <ResetFiltersLink href="/manager/lookup" /> : null}

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
          <>
            <div className="hidden md:block">
              <ListTable>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Summary</TableHead>
                      <TableHead className="text-right">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {directoryResult.users.map((user) => (
                      <TableRow key={user.profile.id}>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {user.profile.displayName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {getShortId(user.profile.id)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <RoleBadge role={user.role} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={user.status} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {getUserSummary(user)}
                        </TableCell>
                        <TableCell className="text-right">
                          <ManagerDetailsLink href={getManagerUserHref(user.profile.id)} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ListTable>
            </div>

            <div className="grid gap-3 md:hidden">
              {directoryResult.users.map((user) => (
                <MobileCard key={user.profile.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold">
                        {user.profile.displayName}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {getShortId(user.profile.id)}
                      </p>
                    </div>
                    <ManagerDetailsLink href={getManagerUserHref(user.profile.id)} />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <RoleBadge role={user.role} />
                    <StatusBadge status={user.status} />
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {getUserSummary(user)}
                  </p>
                </MobileCard>
              ))}
            </div>
          </>
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
            <>
              <div className="hidden md:block">
                <ListTable>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Borrower</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Applications</TableHead>
                        <TableHead>Latest record</TableHead>
                        <TableHead className="text-right">Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {borrowerLookupResult.results.map((resultItem) => (
                        <TableRow key={resultItem.borrower.id}>
                          <TableCell>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {resultItem.borrower.displayName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {getShortId(resultItem.borrower.id)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {resultItem.portfolio?.location ?? "No portfolio location"}
                          </TableCell>
                          <TableCell className="text-xs font-medium">
                            {resultItem.applications.length}
                          </TableCell>
                          <TableCell>
                            {resultItem.applications[0] ? (
                              <div className="flex items-center gap-1.5">
                                <StatusBadge status={resultItem.applications[0].status} />
                                <span className="text-xs text-muted-foreground">
                                  {getShortId(resultItem.applications[0].id)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                No applications
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <ManagerDetailsLink
                              href={getManagerUserHref(resultItem.borrower.id)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ListTable>
              </div>

              <div className="grid gap-3 md:hidden">
                {borrowerLookupResult.results.map((resultItem) => (
                  <MobileCard key={resultItem.borrower.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-sm font-semibold">
                          {resultItem.borrower.displayName}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          {getShortId(resultItem.borrower.id)}
                        </p>
                      </div>
                      <ManagerDetailsLink
                        href={getManagerUserHref(resultItem.borrower.id)}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="truncate text-xs text-muted-foreground">
                        {resultItem.portfolio?.location ?? "No portfolio location"}
                      </span>
                      <span className="text-xs font-semibold">
                        {resultItem.applications.length} applications
                      </span>
                      {resultItem.applications[0] ? (
                        <StatusBadge status={resultItem.applications[0].status} />
                      ) : null}
                    </div>
                  </MobileCard>
                ))}
              </div>
            </>
          ) : null}
        </section>
      ) : null}
    </ManagerShell>
  );
}
