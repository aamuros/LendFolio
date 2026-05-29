import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchX } from "lucide-react";
import type { ManagerApplicationRow } from "@/lib/manager-operations";
import { managerPreferredTermLabels } from "@/lib/manager-operations";
import {
  formatCurrency,
  formatDateOnly,
  ManagerDetailsLink,
  PersonLabel,
  StatusBadge,
} from "@/app/manager/manager-ui";

type ApplicationsTableProps = {
  applications: ManagerApplicationRow[];
  hasActiveFilters: boolean;
};

function OfferSummary({ app }: { app: ManagerApplicationRow }) {
  const total =
    app.offerCounts.pending +
    app.offerCounts.accepted +
    app.offerCounts.declined +
    app.offerCounts.expired;

  if (total === 0) {
    return <span className="text-muted-foreground">No offers</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {app.offerCounts.pending > 0 ? (
        <Badge variant="secondary" className="text-[10px]">
          {app.offerCounts.pending} pending
        </Badge>
      ) : null}
      {app.offerCounts.accepted > 0 ? (
        <Badge variant="default" className="text-[10px]">
          {app.offerCounts.accepted} accepted
        </Badge>
      ) : null}
      {app.offerCounts.declined > 0 ? (
        <Badge variant="destructive" className="text-[10px]">
          {app.offerCounts.declined} declined
        </Badge>
      ) : null}
      {total > 0 &&
      app.offerCounts.pending === 0 &&
      app.offerCounts.accepted === 0 &&
      app.offerCounts.declined === 0 ? (
        <span className="text-xs text-muted-foreground">
          {total} total
        </span>
      ) : null}
    </div>
  );
}

function EmptyTableState({ hasActiveFilters }: { hasActiveFilters: boolean }) {
  return (
    <TableRow>
      <TableCell colSpan={8}>
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <SearchX className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium">No applications found</p>
            <p className="text-xs text-muted-foreground">
              {hasActiveFilters
                ? "Applications matching the current filters will appear here."
                : "Submitted applications will appear here when borrowers apply."}
            </p>
          </div>
          {hasActiveFilters ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/manager/applications">Clear filters</Link>
            </Button>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
}

function MobileEmptyState({ hasActiveFilters }: { hasActiveFilters: boolean }) {
  return (
    <Card className="border-dashed bg-muted/50">
      <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
        <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <SearchX className="size-5" />
        </div>
        <div>
          <p className="text-sm font-medium">No applications found</p>
          <p className="text-xs text-muted-foreground">
            {hasActiveFilters
              ? "Applications matching the current filters will appear here."
              : "Submitted applications will appear here when borrowers apply."}
          </p>
        </div>
        {hasActiveFilters ? (
          <Button variant="outline" size="sm" asChild>
            <Link href="/manager/applications">Clear filters</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ApplicationsTable({
  applications,
  hasActiveFilters,
}: ApplicationsTableProps) {
  if (applications.length === 0) {
    return (
      <>
        <div className="hidden md:block">
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Requested amount</TableHead>
                  <TableHead>Preferred term</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Offers</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Last updated</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <EmptyTableState hasActiveFilters={hasActiveFilters} />
              </TableBody>
            </Table>
          </Card>
        </div>
        <div className="md:hidden">
          <MobileEmptyState hasActiveFilters={hasActiveFilters} />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="hidden md:block">
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Borrower</TableHead>
                <TableHead>Requested amount</TableHead>
                <TableHead>Preferred term</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Offers</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Last updated</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((application) => (
                <TableRow key={application.id}>
                  <TableCell>
                    <div className="min-w-0">
                      <PersonLabel person={application.borrower} />
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {application.purpose}
                      </p>
                    </div>
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
                  <TableCell>
                    <OfferSummary app={application} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateOnly(application.submittedAt)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateOnly(application.submittedAt)}
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
        </Card>
      </div>

      <div className="grid gap-3 md:hidden">
        {applications.map((application) => (
          <Card key={application.id} size="sm">
            <CardContent className="grid gap-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold">
                    {application.borrower.displayName}
                  </h2>
                  <p className="truncate text-xs text-muted-foreground">
                    {application.purpose}
                  </p>
                </div>
                <ManagerDetailsLink
                  href={`/manager/applications/${application.id}`}
                />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-sm font-semibold">
                  {formatCurrency(application.requestedAmount)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {managerPreferredTermLabels[application.preferredTerm]}
                </span>
                <StatusBadge status={application.status} />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <OfferSummary app={application} />
                <span className="text-xs text-muted-foreground">
                  Submitted {formatDateOnly(application.submittedAt)}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
