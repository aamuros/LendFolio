import Link from "next/link";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Users, HandCoins, ShieldCheck, UserCircle } from "lucide-react";
import {
  AccessDenied,
  EmptyState,
  FilterForm,
  ListTable,
  ManagerDetailsLink,
  ManagerShell,
  MobileCard,
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
        title="Users"
        description="Search users, borrower records, applications, loans, and repayment activity."
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
  const users = directoryResult.users;
  const totalCount = users.length;
  const borrowerCount = users.filter((u) => u.role === "borrower").length;
  const lenderCount = users.filter((u) => u.role === "lender").length;
  const managerCount = users.filter((u) => u.role === "manager").length;

  return (
    <ManagerShell
      title="Users"
      description="Search users, borrower records, applications, loans, and repayment activity."
    >
      <div className="space-y-6">
        <Card>
          <CardContent>
            <FilterForm className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
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
              <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
                <Button type="submit" className="flex-1 sm:flex-none">
                  Apply
                </Button>
                {hasActiveFilters ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 sm:flex-none"
                    asChild
                  >
                    <Link href="/manager/lookup">Clear</Link>
                  </Button>
                ) : null}
              </div>
            </FilterForm>
          </CardContent>
        </Card>

        {!directoryResult.ok ? (
          <StatusMessage message={directoryResult.message} tone="error" />
        ) : null}

        {totalCount > 0 ? (
          <section
            aria-label="User summary"
            className="*:data-[slot=card]:shadow-xs grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <Card>
              <CardHeader>
                <CardDescription className="text-xs font-medium">
                  Total users
                </CardDescription>
                <CardAction>
                  <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Users className="size-4" />
                  </div>
                </CardAction>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tracking-tight tabular-nums">
                  {totalCount}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  All registered accounts.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription className="text-xs font-medium">
                  Borrowers
                </CardDescription>
                <CardAction>
                  <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <UserCircle className="size-4" />
                  </div>
                </CardAction>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tracking-tight tabular-nums">
                  {borrowerCount}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Borrower accounts on the platform.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription className="text-xs font-medium">
                  Lenders
                </CardDescription>
                <CardAction>
                  <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <HandCoins className="size-4" />
                  </div>
                </CardAction>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tracking-tight tabular-nums">
                  {lenderCount}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Lender accounts on the platform.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription className="text-xs font-medium">
                  Managers
                </CardDescription>
                <CardAction>
                  <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <ShieldCheck className="size-4" />
                  </div>
                </CardAction>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tracking-tight tabular-nums">
                  {managerCount}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Platform manager accounts.
                </p>
              </CardContent>
            </Card>
          </section>
        ) : null}

        <section>
          {totalCount === 0 ? (
            <div className="grid gap-3">
              <EmptyState
                title={
                  hasActiveFilters
                    ? "No users match these filters"
                    : "No users yet"
                }
                description={
                  hasActiveFilters
                    ? "Try adjusting your search or filters."
                    : "Users will appear here when accounts are created."
                }
              />
              {hasActiveFilters ? (
                <div className="flex justify-center">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/manager/lookup">Clear filters</Link>
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

          {totalCount > 0 ? (
            <>
              <div className="hidden md:block">
                <ListTable>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Activity</TableHead>
                        <TableHead className="w-[96px] text-center">
                          Details
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.profile.id}>
                          <TableCell className="py-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {user.profile.displayName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {getShortId(user.profile.id)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <RoleBadge role={user.role} />
                          </TableCell>
                          <TableCell className="py-3">
                            <StatusBadge status={user.status} />
                          </TableCell>
                          <TableCell className="py-3 text-xs text-muted-foreground">
                            {getUserSummary(user)}
                          </TableCell>
                          <TableCell className="py-3 text-center">
                            <ManagerDetailsLink
                              href={getManagerUserHref(user.profile.id)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ListTable>
              </div>

              <div className="grid gap-3 md:hidden">
                {users.map((user) => (
                  <MobileCard key={user.profile.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-sm font-semibold">
                          {user.profile.displayName}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          {getShortId(user.profile.id)}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <ManagerDetailsLink
                          href={getManagerUserHref(user.profile.id)}
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <RoleBadge role={user.role} />
                      <StatusBadge status={user.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {getUserSummary(user)}
                    </p>
                  </MobileCard>
                ))}
              </div>
            </>
          ) : null}
        </section>

        {q ? (
          <>
            <Separator />

            <section className="grid gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold">Borrower records</h2>
                  <Badge variant="secondary">
                    {borrowerLookupResult.results.length}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Matching portfolios, applications, and loans.
                </p>
              </div>

              {!borrowerLookupResult.ok ? (
                <StatusMessage
                  message={borrowerLookupResult.message}
                  tone="error"
                />
              ) : null}

              {borrowerLookupResult.results.length === 0 &&
              borrowerLookupResult.ok ? (
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
                            <TableHead className="w-[96px] text-center">
                              Details
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {borrowerLookupResult.results.map((resultItem) => (
                            <TableRow key={resultItem.borrower.id}>
                              <TableCell className="py-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium">
                                    {resultItem.borrower.displayName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {getShortId(resultItem.borrower.id)}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="py-3 text-xs text-muted-foreground">
                                {resultItem.portfolio?.location ??
                                  "No portfolio location"}
                              </TableCell>
                              <TableCell className="py-3 text-xs font-medium">
                                {resultItem.applications.length}
                              </TableCell>
                              <TableCell className="py-3">
                                {resultItem.applications[0] ? (
                                  <div className="flex items-center gap-1.5">
                                    <StatusBadge
                                      status={resultItem.applications[0].status}
                                    />
                                    <span className="text-xs text-muted-foreground">
                                      {getShortId(
                                        resultItem.applications[0].id,
                                      )}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    No applications
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="py-3 text-center">
                                <ManagerDetailsLink
                                  href={getManagerUserHref(
                                    resultItem.borrower.id,
                                  )}
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
                          <div className="min-w-0 flex-1">
                            <h2 className="truncate text-sm font-semibold">
                              {resultItem.borrower.displayName}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                              {getShortId(resultItem.borrower.id)}
                            </p>
                          </div>
                          <div className="shrink-0">
                            <ManagerDetailsLink
                              href={getManagerUserHref(resultItem.borrower.id)}
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="truncate text-xs text-muted-foreground">
                            {resultItem.portfolio?.location ??
                              "No portfolio location"}
                          </span>
                          <span className="text-xs font-semibold">
                            {resultItem.applications.length} applications
                          </span>
                          {resultItem.applications[0] ? (
                            <StatusBadge
                              status={resultItem.applications[0].status}
                            />
                          ) : null}
                        </div>
                      </MobileCard>
                    ))}
                  </div>
                </>
              ) : null}
            </section>
          </>
        ) : null}
      </div>
    </ManagerShell>
  );
}
