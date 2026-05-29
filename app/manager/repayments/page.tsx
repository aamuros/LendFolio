import Link from "next/link";
import { requireManager } from "@/lib/access-control";
import { resolveSubmittedDateRangeFilters } from "@/lib/date-ranges";
import { getShortId, loadManagerRepayments } from "@/lib/manager-operations";
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
    proofStatus?: string;
    repaymentStatus?: string;
    lender?: string;
    borrower?: string;
    range?: string;
    submittedFrom?: string;
    submittedTo?: string;
  }>;
};

export default async function ManagerRepaymentsPage({ searchParams }: PageProps) {
  const filters = await searchParams;
  const access = await requireManager();

  if (!access.ok) {
    return (
      <ManagerShell
        title="Repayment proofs"
        description="Read-only monitor for repayment proof submissions and review outcomes."
      >
        <AccessDenied message={access.message} />
      </ManagerShell>
    );
  }

  const submittedDateFilters = resolveSubmittedDateRangeFilters(filters);
  const result = await loadManagerRepayments(access.supabase, {
    ...filters,
    ...submittedDateFilters,
  });
  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <ManagerShell
      title="Repayment proofs"
      description="Monitor submitted evidence, repayment status, and lender review notes."
    >
      <AutoFilterGrid>
        <SelectFilter
          label="Proof status"
          name="proofStatus"
          defaultValue={filters.proofStatus}
          options={[
            { value: "submitted", label: "Submitted" },
            { value: "verified", label: "Verified" },
            { value: "rejected", label: "Rejected" },
          ]}
        />
        <SelectFilter
          label="Repayment status"
          name="repaymentStatus"
          defaultValue={filters.repaymentStatus}
          options={[
            { value: "due", label: "Due" },
            { value: "submitted", label: "Submitted" },
            { value: "verified", label: "Verified" },
            { value: "rejected", label: "Rejected" },
            { value: "late", label: "Late" },
          ]}
        />
        <TextFilter label="Lender" name="lender" defaultValue={filters.lender} />
        <TextFilter
          label="Borrower"
          name="borrower"
          defaultValue={filters.borrower}
        />
        <SelectFilter
          label="Submitted range"
          name="range"
          defaultValue={filters.range}
          emptyLabel="Any time"
          options={[
            { value: "this_week", label: "This week" },
            { value: "this_month", label: "This month" },
            { value: "this_year", label: "This year" },
            { value: "custom", label: "Custom" },
          ]}
        />
        <TextFilter
          label="Submitted from"
          name="submittedFrom"
          type="date"
          defaultValue={filters.submittedFrom}
        />
        <TextFilter
          label="Submitted to"
          name="submittedTo"
          type="date"
          defaultValue={filters.submittedTo}
        />
      </AutoFilterGrid>

      {hasActiveFilters ? (
        <Link
          href="/manager/repayments"
          className="w-fit text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          Reset filters
        </Link>
      ) : null}

      <StatusMessage message={result.message} tone={result.ok ? "neutral" : "error"} />

      <section>
        {result.proofs.length === 0 ? (
          <EmptyState
            title="No repayment proofs found"
            description="Proofs matching the current filters will appear here."
          />
        ) : null}

        {result.proofs.length > 0 ? (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proof</TableHead>
                    <TableHead>Borrower</TableHead>
                    <TableHead>Lender</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.proofs.map((proof) => (
                    <TableRow key={proof.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {proof.fileName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Loan {getShortId(proof.activeLoanId)} · installment{" "}
                            {proof.installmentNumber}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <PersonLabel person={proof.borrower} />
                      </TableCell>
                      <TableCell>
                        <PersonLabel person={proof.lender} />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">
                            {formatCurrency(proof.amountDue)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Due {formatDateOnly(proof.dueDate)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={proof.proofStatus} />
                      </TableCell>
                      <TableCell className="text-right">
                        <ManagerDetailsLink href={`/manager/repayments/${proof.id}`} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-3 md:hidden">
              {result.proofs.map((proof) => (
                <article
                  key={proof.id}
                  className="grid gap-2 rounded-lg border bg-card p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold">
                        {proof.fileName}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Loan {getShortId(proof.activeLoanId)} · installment{" "}
                        {proof.installmentNumber}
                      </p>
                    </div>
                    <ManagerDetailsLink href={`/manager/repayments/${proof.id}`} />
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
