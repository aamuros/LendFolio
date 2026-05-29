import Link from "next/link";
import { requireManager } from "@/lib/access-control";
import { getShortId, loadManagerLoans } from "@/lib/manager-operations";
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
  formatDateOnly,
} from "../manager-ui";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    status?: string;
    lender?: string;
    borrower?: string;
    dueFrom?: string;
    dueTo?: string;
  }>;
};

export default async function ManagerLoansPage({ searchParams }: PageProps) {
  const filters = await searchParams;
  const access = await requireManager();

  if (!access.ok) {
    return (
      <ManagerShell
        title="Active loans"
        description="Read-only portfolio view for funded loans and repayment schedule progress."
      >
        <AccessDenied message={access.message} />
      </ManagerShell>
    );
  }

  const result = await loadManagerLoans(access.supabase, filters);
  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <ManagerShell
      title="Active loans"
      description="Review funded loans by status, borrower, lender, and due date."
    >
      <AutoFilterGrid>
        <SelectFilter
          label="Status"
          name="status"
          defaultValue={filters.status}
          options={[
            { value: "active", label: "Active" },
            { value: "paid", label: "Paid" },
            { value: "overdue", label: "Overdue" },
            { value: "defaulted", label: "Defaulted" },
            { value: "closed", label: "Closed" },
          ]}
        />
        <TextFilter label="Lender" name="lender" defaultValue={filters.lender} />
        <TextFilter
          label="Borrower"
          name="borrower"
          defaultValue={filters.borrower}
        />
        <TextFilter
          label="Due date from"
          name="dueFrom"
          type="date"
          defaultValue={filters.dueFrom}
        />
        <TextFilter
          label="Due date to"
          name="dueTo"
          type="date"
          defaultValue={filters.dueTo}
        />
      </AutoFilterGrid>

      {hasActiveFilters ? (
        <Link
          href="/manager/loans"
          className="w-fit text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          Reset filters
        </Link>
      ) : null}

      <StatusMessage message={result.message} tone={result.ok ? "neutral" : "error"} />

      <section>
        {result.loans.length === 0 ? (
          <EmptyState
            title="No active loans found"
            description="Loans matching the current filters will appear here."
          />
        ) : null}

        {result.loans.length > 0 ? (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loan</TableHead>
                    <TableHead>Borrower</TableHead>
                    <TableHead>Lender</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.loans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            Loan {getShortId(loan.id)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {loan.schedule.verifiedCount}/
                            {loan.schedule.installmentCount} verified
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <PersonLabel person={loan.borrower} />
                      </TableCell>
                      <TableCell>
                        <PersonLabel person={loan.lender} />
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(loan.outstandingBalance)}
                      </TableCell>
                      <TableCell>{formatDateOnly(loan.dueDate)}</TableCell>
                      <TableCell>
                        <StatusBadge status={loan.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <ManagerDetailsLink href={`/manager/loans/${loan.id}`} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-3 md:hidden">
              {result.loans.map((loan) => (
                <article
                  key={loan.id}
                  className="grid gap-2 rounded-lg border bg-card p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold">
                        Loan {getShortId(loan.id)}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Due {formatDateOnly(loan.dueDate)}
                      </p>
                    </div>
                    <ManagerDetailsLink href={`/manager/loans/${loan.id}`} />
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {loan.borrower.displayName} &rarr; {loan.lender.displayName}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-sm font-semibold">
                      {formatCurrency(loan.outstandingBalance)}
                    </span>
                    <StatusBadge status={loan.status} />
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
