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
import { Button } from "@/components/ui/button";
import {
  StatusBadge,
  PersonLabel,
  ManagerTableCard,
  ManagerDetailsLink,
  MobileCard,
  formatCurrency,
  formatDateOnly,
  formatDateTime,
} from "@/app/manager/manager-ui";
import { ReceiptTextIcon } from "lucide-react";
import { ManagerEmptyState } from "@/components/manager/manager-empty-state";

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
      <ManagerEmptyState
        icon={ReceiptTextIcon}
        title="No repayment proofs found"
        description="Submitted proof records matching the current filters will appear here."
        action={
          hasActiveFilters ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/manager/repayments">Clear filters</Link>
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <>
      <div className="hidden md:block">
        <ManagerTableCard>
          <Table className="min-w-[1330px] table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[90px]">Proof ID</TableHead>
                <TableHead className="w-[165px]">Borrower</TableHead>
                <TableHead className="w-[165px]">Lender</TableHead>
                <TableHead className="w-[100px]">Loan</TableHead>
                <TableHead className="w-[120px]">Amount</TableHead>
                <TableHead className="w-[120px]">Due date</TableHead>
                <TableHead className="w-[170px]">Submitted</TableHead>
                <TableHead className="w-[145px]">Proof status</TableHead>
                <TableHead className="w-[155px]">Repayment status</TableHead>
                <TableHead className="w-[100px] pr-4 text-right">Action</TableHead>
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
                  <TableCell className="whitespace-normal">
                    <PersonLabel person={proof.borrower} />
                  </TableCell>
                  <TableCell className="whitespace-normal">
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
                  <TableCell className="pr-4 text-right">
                    <ManagerDetailsLink
                      href={`/manager/repayments/${proof.id}`}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ManagerTableCard>
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
