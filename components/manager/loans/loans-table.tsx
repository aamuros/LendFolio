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
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CircleDollarSign } from "lucide-react";
import type { ManagerLoanRow } from "@/lib/manager-operations";
import { getShortId } from "@/lib/manager-operations";
import {
  formatCurrency,
  formatDateOnly,
  ManagerDetailsLink,
  PersonLabel,
  StatusBadge,
} from "@/app/manager/manager-ui";

type LoansTableProps = {
  loans: ManagerLoanRow[];
  hasActiveFilters: boolean;
};

function RepaymentProgress({ loan }: { loan: ManagerLoanRow }) {
  const { verifiedCount, installmentCount } = loan.schedule;
  const percent =
    installmentCount > 0
      ? Math.round((verifiedCount / installmentCount) * 100)
      : 0;

  return (
    <div className="min-w-[120px]">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {verifiedCount} of {installmentCount} paid
        </span>
        <span className="ml-2 font-medium tabular-nums">{percent}%</span>
      </div>
      <Progress value={percent} className="mt-1" />
    </div>
  );
}

function NextDueInfo({ loan }: { loan: ManagerLoanRow }) {
  if (!loan.dueDate) {
    return <span className="text-xs text-muted-foreground">--</span>;
  }

  const now = new Date();
  const due = new Date(loan.dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  let label: string;
  let tone: string;

  if (diffDays < 0) {
    label = `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} overdue`;
    tone = "text-destructive";
  } else if (diffDays === 0) {
    label = "Due today";
    tone = "text-amber-600";
  } else if (diffDays <= 7) {
    label = `Due in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
    tone = "text-amber-600";
  } else {
    label = formatDateOnly(loan.dueDate);
    tone = "text-muted-foreground";
  }

  return (
    <div>
      <p className="text-sm">{formatDateOnly(loan.dueDate)}</p>
      <p className={`text-xs ${tone}`}>{label}</p>
    </div>
  );
}

function EmptyTableState({ hasActiveFilters }: { hasActiveFilters: boolean }) {
  return (
    <TableRow>
      <TableCell colSpan={9}>
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <CircleDollarSign className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium">No active loans found</p>
            <p className="text-xs text-muted-foreground">
              Funded loans matching the current filters will appear here.
            </p>
          </div>
          {hasActiveFilters ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/manager/loans">Clear filters</Link>
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
          <CircleDollarSign className="size-5" />
        </div>
        <div>
          <p className="text-sm font-medium">No active loans found</p>
          <p className="text-xs text-muted-foreground">
            Funded loans matching the current filters will appear here.
          </p>
        </div>
        {hasActiveFilters ? (
          <Button variant="outline" size="sm" asChild>
            <Link href="/manager/loans">Clear filters</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function LoansTable({ loans, hasActiveFilters }: LoansTableProps) {
  if (loans.length === 0) {
    return (
      <>
        <div className="hidden md:block">
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loan ID</TableHead>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Lender</TableHead>
                  <TableHead>Principal</TableHead>
                  <TableHead>Outstanding balance</TableHead>
                  <TableHead>Next due date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Repayment progress</TableHead>
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
                <TableHead>Loan ID</TableHead>
                <TableHead>Borrower</TableHead>
                <TableHead>Lender</TableHead>
                <TableHead>Principal</TableHead>
                <TableHead>Outstanding balance</TableHead>
                <TableHead>Next due date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Repayment progress</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.map((loan) => (
                <TableRow key={loan.id}>
                  <TableCell>
                    <p className="truncate text-sm font-medium">
                      {getShortId(loan.id)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <PersonLabel person={loan.borrower} />
                  </TableCell>
                  <TableCell>
                    <PersonLabel person={loan.lender} />
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(loan.principalAmount)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(loan.outstandingBalance)}
                  </TableCell>
                  <TableCell>
                    <NextDueInfo loan={loan} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={loan.status} />
                  </TableCell>
                  <TableCell>
                    <RepaymentProgress loan={loan} />
                  </TableCell>
                  <TableCell className="text-right">
                    <ManagerDetailsLink
                      href={`/manager/loans/${loan.id}`}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      <div className="grid gap-3 md:hidden">
        {loans.map((loan) => (
          <Card key={loan.id} size="sm">
            <CardContent className="grid gap-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold">
                    Loan {getShortId(loan.id)}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    <NextDueInfo loan={loan} />
                  </p>
                </div>
                <ManagerDetailsLink
                  href={`/manager/loans/${loan.id}`}
                />
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
              <RepaymentProgress loan={loan} />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
