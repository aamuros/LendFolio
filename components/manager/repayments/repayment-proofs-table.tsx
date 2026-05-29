import Link from "next/link";
import type { ManagerRepaymentProofRow } from "@/lib/manager-operations";
import { getShortId } from "@/lib/manager-operations";
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
import {
  StatusBadge,
  PersonLabel,
  ManagerDetailsLink,
  MobileCard,
  formatCurrency,
  formatDateOnly,
  formatDateTime,
} from "@/app/manager/manager-ui";
import { ReceiptTextIcon } from "lucide-react";

type RepaymentProofsTableProps = {
  proofs: ManagerRepaymentProofRow[];
  hasActiveFilters: boolean;
};

export function RepaymentProofsTable({
  proofs,
  hasActiveFilters,
}: RepaymentProofsTableProps) {
  if (proofs.length === 0) {
    return (
      <Card className="border border-dashed border-border/60 bg-muted/30 ring-0">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <ReceiptTextIcon className="size-5" />
          </div>
          <div className="grid gap-1">
            <h3 className="text-sm font-medium">No repayment proofs found</h3>
            <p className="text-xs text-muted-foreground">
              Submitted proof records matching the current filters will appear here.
            </p>
          </div>
          {hasActiveFilters ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/manager/repayments">Clear filters</Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="hidden md:block">
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proof ID</TableHead>
                <TableHead>Borrower</TableHead>
                <TableHead>Lender</TableHead>
                <TableHead>Loan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Proof status</TableHead>
                <TableHead>Repayment status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proofs.map((proof) => (
                <TableRow key={proof.id}>
                  <TableCell>
                    <span className="text-xs font-mono text-muted-foreground">
                      {getShortId(proof.id)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <PersonLabel person={proof.borrower} />
                  </TableCell>
                  <TableCell>
                    <PersonLabel person={proof.lender} />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {getShortId(proof.activeLoanId)}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      #{proof.installmentNumber}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">
                      {formatCurrency(proof.amountDue)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {formatDateOnly(proof.dueDate)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {formatDateTime(proof.submittedAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={proof.proofStatus} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={proof.repaymentStatus} />
                  </TableCell>
                  <TableCell className="text-right">
                    <ManagerDetailsLink
                      href={`/manager/repayments/${proof.id}`}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      <div className="grid gap-3 md:hidden">
        {proofs.map((proof) => (
          <MobileCard key={proof.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold">
                  {proof.fileName}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Loan {getShortId(proof.activeLoanId)} · Installment{" "}
                  {proof.installmentNumber}
                </p>
              </div>
              <ManagerDetailsLink
                href={`/manager/repayments/${proof.id}`}
              />
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {proof.borrower.displayName} → {proof.lender.displayName}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-sm font-semibold">
                {formatCurrency(proof.amountDue)}
              </span>
              <span className="text-xs text-muted-foreground">
                Due {formatDateOnly(proof.dueDate)}
              </span>
              <StatusBadge status={proof.proofStatus} />
              <StatusBadge status={proof.repaymentStatus} />
            </div>
            <p className="text-xs text-muted-foreground">
              Submitted {formatDateTime(proof.submittedAt)}
            </p>
          </MobileCard>
        ))}
      </div>
    </>
  );
}
