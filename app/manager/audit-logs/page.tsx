import { getManagerAccess } from "../manager-access";
import Link from "next/link";
import { getShortId, loadManagerAuditLogs } from "@/lib/manager-operations";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AccessDenied,
  EmptyState,
  FilterForm,
  ListTable,
  ManagerDetailsLink,
  ManagerShell,
  MobileCard,
  PersonLabel,
  TextFilter,
  formatDateTime,
} from "../manager-ui";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { withServerTiming } from "@/lib/perf";

const PAGE_SIZE = 20;

type PageProps = {
  searchParams: Promise<{
    action?: string;
    targetTable?: string;
    actor?: string;
    createdFrom?: string;
    createdTo?: string;
    page?: string;
  }>;
};

const actionLabels: Record<string, string> = {
  lender_approved: "Lender approved",
  lender_rejected: "Lender rejected",
  lender_signup_submitted: "Lender signup submitted",
  borrower_readiness_evaluated: "Borrower readiness evaluated",
  borrower_profile_created: "Borrower profile created",
  borrower_profile_updated: "Borrower profile updated",
  borrower_verification_approved: "Borrower verification approved",
  borrower_verification_rejected: "Borrower verification rejected",
  borrower_verification_resubmit: "Borrower verification resubmit",
  borrower_verification_submitted: "Borrower verification submitted",
  profile_created: "Profile created",
  profile_updated: "Profile updated",
  application_submitted: "Application submitted",
  application_withdrawn: "Application withdrawn",
  application_edited: "Application edited",
  offer_sent: "Offer sent",
  offer_accepted: "Offer accepted",
  offer_declined: "Offer declined",
  offer_expired: "Offer expired",
  loan_created: "Loan created",
  loan_activated: "Loan activated",
  loan_completed: "Loan completed",
  repayment_uploaded: "Repayment uploaded",
  repayment_verified: "Repayment verified",
  repayment_rejected: "Repayment rejected",
  consent_tos_accepted: "Terms of service accepted",
  consent_privacy_accepted: "Privacy notice accepted",
  consent_credit_authorized: "Credit review authorized",
  consent_doc_processing_accepted: "Doc processing consent accepted",
  notification_created: "Notification created",
  account_provisioned: "Account provisioned",
};

const targetTableLabels: Record<string, string> = {
  profiles: "Profile",
  lender_profiles: "Lender profile",
  borrower_portfolios: "Borrower portfolio",
  loan_applications: "Loan application",
  loans: "Loan",
  offers: "Offer",
  repayment_proofs: "Repayment proof",
  repayment_schedules: "Repayment schedule",
  borrower_verifications: "Borrower verification",
  audit_logs: "Audit log",
  notifications: "Notification",
  consents: "Consent",
};

type AuditCategory =
  | "Profile"
  | "Borrower"
  | "Lender"
  | "Application"
  | "Loan"
  | "Repayment"
  | "Consent"
  | "System"
  | "Other";

const categoryStyles: Record<AuditCategory, string> = {
  Profile: "bg-slate-100 text-slate-700 border-slate-200",
  Borrower: "bg-blue-50 text-blue-700 border-blue-200",
  Lender: "bg-violet-50 text-violet-700 border-violet-200",
  Application: "bg-amber-50 text-amber-700 border-amber-200",
  Loan: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Repayment: "bg-teal-50 text-teal-700 border-teal-200",
  Consent: "bg-pink-50 text-pink-700 border-pink-200",
  System: "bg-gray-100 text-gray-600 border-gray-200",
  Other: "bg-muted text-muted-foreground",
};

function humanizeAction(action: string): string {
  if (actionLabels[action]) return actionLabels[action];
  return action
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function humanizeTargetTable(table: string): string {
  return targetTableLabels[table] ?? table;
}

function getAuditCategory(action: string, targetTable: string): AuditCategory {
  if (action.startsWith("consent_") || targetTable === "consents") return "Consent";
  if (action.startsWith("borrower_") || targetTable === "borrower_portfolios" || targetTable === "borrower_verifications") return "Borrower";
  if (action.startsWith("lender_") || targetTable === "lender_profiles") return "Lender";
  if (targetTable === "loan_applications" || action.startsWith("application_")) return "Application";
  if (targetTable === "loans" || targetTable === "repayment_schedules" || action.startsWith("loan_")) return "Loan";
  if (targetTable === "repayment_proofs" || action.startsWith("repayment_")) return "Repayment";
  if (targetTable === "profiles" || action.startsWith("profile_")) return "Profile";
  if (action.startsWith("notification_") || action.startsWith("account_")) return "System";
  return "Other";
}

function buildPageUrl(
  filters: Record<string, string | undefined>,
  page: number,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  params.set("page", String(page));
  return `/manager/audit-logs?${params.toString()}`;
}

function getPageRange(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [1];

  if (current > 3) {
    pages.push("ellipsis");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push("ellipsis");
  }

  pages.push(total);
  return pages;
}

export default async function ManagerAuditLogsPage({ searchParams }: PageProps) {
  const filters = await searchParams;
  const access = await getManagerAccess();

  if (!access.ok) {
    return (
      <ManagerShell
        title="Audit logs"
        description="Review workflow events by actor, action, target, and date."
      >
        <AccessDenied message={access.message} />
      </ManagerShell>
    );
  }

  const currentPage = Math.max(1, Number(filters.page) || 1);
  const filterParams = {
    action: filters.action,
    targetTable: filters.targetTable,
    actor: filters.actor,
    createdFrom: filters.createdFrom,
    createdTo: filters.createdTo,
  };

  const { result } = await withServerTiming(
    "loadManagerAuditLogs",
    () => loadManagerAuditLogs(access.supabase, filterParams, { page: currentPage, pageSize: PAGE_SIZE }),
  );
  const hasActiveFilters = Object.values(filterParams).some(Boolean);

  const totalPages = result.ok ? Math.max(1, Math.ceil(result.totalCount / PAGE_SIZE)) : 1;
  const safePage = result.ok ? Math.min(currentPage, totalPages) : 1;
  const rangeStart = result.ok ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = result.ok ? Math.min(safePage * PAGE_SIZE, result.totalCount) : 0;
  const pageRange = getPageRange(safePage, totalPages);

  return (
    <ManagerShell
      title="Audit logs"
      description="Review workflow events by actor, action, target, and date."
    >
      <Card>
        <CardContent>
          <FilterForm className="flex flex-wrap items-end gap-3">
            <div className="min-w-[140px] flex-1">
              <TextFilter label="Action" name="action" defaultValue={filters.action} />
            </div>
            <div className="min-w-[140px] flex-1">
              <TextFilter
                label="Target table"
                name="targetTable"
                defaultValue={filters.targetTable}
              />
            </div>
            <div className="min-w-[140px] flex-1">
              <TextFilter label="Actor" name="actor" defaultValue={filters.actor} />
            </div>
            <div className="min-w-[140px] flex-1">
              <TextFilter
                label="Created from"
                name="createdFrom"
                type="date"
                defaultValue={filters.createdFrom}
              />
            </div>
            <div className="min-w-[140px] flex-1">
              <TextFilter
                label="Created to"
                name="createdTo"
                type="date"
                defaultValue={filters.createdTo}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit">Apply</Button>
              {hasActiveFilters ? (
                <Button type="button" variant="outline" asChild>
                  <Link href="/manager/audit-logs">Clear</Link>
                </Button>
              ) : null}
            </div>
          </FilterForm>
        </CardContent>
      </Card>

      {!result.ok ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {result.message}
        </div>
      ) : null}

      {result.ok && result.totalCount > 0 ? (
        <p className="text-xs text-muted-foreground">
          {rangeStart}–{rangeEnd} of {result.totalCount} event{result.totalCount === 1 ? "" : "s"}
        </p>
      ) : null}

      {result.logs.length === 0 ? (
        <EmptyState
          title={hasActiveFilters ? "No audit logs match the current filters" : "No audit logs yet"}
          description={
            hasActiveFilters
              ? "Try adjusting or resetting the filters above."
              : "Workflow events will appear here after platform activity is recorded."
          }
        />
      ) : null}

      {result.logs.length > 0 ? (
        <>
          <div className="hidden md:block">
            <ListTable>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.logs.map((log) => {
                    const category = getAuditCategory(log.action, log.targetTable);
                    return (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {humanizeAction(log.action)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Event {getShortId(log.id)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={categoryStyles[category]}
                          >
                            {category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.actor ? (
                            <PersonLabel person={log.actor} />
                          ) : (
                            <span className="text-sm text-muted-foreground">System</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">
                            {humanizeTargetTable(log.targetTable)} · {getShortId(log.targetId)}
                          </p>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(log.timestamp)}
                        </TableCell>
                        <TableCell className="text-right">
                          <ManagerDetailsLink href={`/manager/audit-logs/${log.id}`} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ListTable>
          </div>

          <div className="grid gap-3 md:hidden">
            {result.logs.map((log) => {
              const category = getAuditCategory(log.action, log.targetTable);
              return (
                <MobileCard key={log.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold">
                        {humanizeAction(log.action)}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Event {getShortId(log.id)}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={categoryStyles[category]}
                    >
                      {category}
                    </Badge>
                  </div>
                  <div className="grid gap-1 text-xs">
                    <p>
                      <span className="text-muted-foreground">Actor: </span>
                      {log.actor ? log.actor.displayName : "System"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Target: </span>
                      {humanizeTargetTable(log.targetTable)} · {getShortId(log.targetId)}
                    </p>
                    <p className="text-muted-foreground">
                      {formatDateTime(log.timestamp)}
                    </p>
                  </div>
                  <ManagerDetailsLink href={`/manager/audit-logs/${log.id}`} />
                </MobileCard>
              );
            })}
          </div>

          {totalPages > 1 ? (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href={safePage > 1 ? buildPageUrl(filterParams, safePage - 1) : "#"}
                    aria-disabled={safePage <= 1}
                    className={safePage <= 1 ? "pointer-events-none opacity-50" : undefined}
                  />
                </PaginationItem>
                {pageRange.map((item, index) =>
                  item === "ellipsis" ? (
                    <PaginationItem key={`ellipsis-${index}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={item}>
                      <PaginationLink
                        href={buildPageUrl(filterParams, item)}
                        isActive={item === safePage}
                      >
                        {item}
                      </PaginationLink>
                    </PaginationItem>
                  ),
                )}
                <PaginationItem>
                  <PaginationNext
                    href={safePage < totalPages ? buildPageUrl(filterParams, safePage + 1) : "#"}
                    aria-disabled={safePage >= totalPages}
                    className={safePage >= totalPages ? "pointer-events-none opacity-50" : undefined}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          ) : null}
        </>
      ) : null}
    </ManagerShell>
  );
}
